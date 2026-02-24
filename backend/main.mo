import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Int "mo:core/Int";
import Nat "mo:core/Nat";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  type UserProfile = {
    principal : Principal;
    username : Text;
    coupleCode : Text;
    paired : Bool;
    partner : ?Principal;
  };

  type Message = {
    senderPrincipal : Principal;
    senderUsername : Text;
    messageText : Text;
    timestamp : Text;
    read : Bool;
  };

  type MediaItem = {
    id : Text;
    blob : Storage.ExternalBlob;
    mimeType : Text;
    uploader : Principal;
    uploaderUsername : Text;
    timestampNanos : Int;
  };

  type CallStatus = {
    #calling;
    #active;
    #ended;
    #declined;
  };

  type CallType = {
    #voice;
    #video;
  };

  type CallSession = {
    id : Text;
    callerId : Principal;
    callerUsername : Text;
    receiverId : Principal;
    receiverUsername : Text;
    status : CallStatus;
    createdAt : Int;
    offerSDP : ?Text;
    answerSDP : ?Text;
    callerICE : [Text];
    receiverICE : [Text];
    callType : CallType;
  };

  type CallHistory = {
    id : Text;
    callerId : Principal;
    callerUsername : Text;
    receiverId : Principal;
    receiverUsername : Text;
    durationSeconds : Nat;
    timestamp : Int;
    status : {
      #ended;
      #declined;
      #missed;
    };
    callType : CallType;
  };

  let MAX_USERS = 2;

  let userProfiles = Map.empty<Principal, UserProfile>();
  let messages = List.empty<Message>();
  let mediaItems = Map.empty<Text, MediaItem>();
  let callSessions = Map.empty<Text, CallSession>();
  let callHistory = List.empty<CallHistory>();

  // ── helpers ────────────────────────────────────────────────────────────────

  // Returns true when caller is one of the two paired users.
  func requirePaired(caller : Principal) : () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access this resource");
    };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Unauthorized: User profile not found") };
      case (?profile) {
        if (not profile.paired) {
          Runtime.trap("Unauthorized: Only paired users can access this resource");
        };
      };
    };
  };

  // Returns the caller's partner principal, trapping if not paired.
  func getPartnerPrincipal(caller : Principal) : Principal {
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?profile) {
        switch (profile.partner) {
          case (null) { Runtime.trap("User is not paired") };
          case (?partner) { partner };
        };
      };
    };
  };

  func generateRandomCode() : Text {
    let num = Time.now() % 900000 + 100000;
    num.toText();
  };

  // ── profile API ────────────────────────────────────────────────────────────

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Caller must be a user");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save their profile");
    };
    userProfiles.add(caller, profile);
  };

  // ── registration & pairing ─────────────────────────────────────────────────

  public shared ({ caller }) func registerUser(username : Text) : async () {
    // Reject anonymous principals – they cannot become users.
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot register");
    };
    if (userProfiles.size() >= MAX_USERS) {
      Runtime.trap("Registration limit reached. Only 2 users are allowed.");
    };
    if (userProfiles.containsKey(caller)) {
      Runtime.trap("User already registered");
    };
    let coupleCode = generateRandomCode();
    let profile : UserProfile = {
      principal = caller;
      username;
      coupleCode;
      paired = false;
      partner = null;
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getMyProfile() : async UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access profile information");
    };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) { profile };
    };
  };

  public query ({ caller }) func getUserCount() : async Nat {
    userProfiles.size();
  };

  public shared ({ caller }) func generateCoupleCode() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can generate codes");
    };
    let newCode = generateRandomCode();
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) {
        let updatedProfile = { profile with coupleCode = newCode };
        userProfiles.add(caller, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func pairWithCode(code : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can pair with a code");
    };
    let callerProfile = switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) { profile };
    };

    let iter = userProfiles.entries();
    let match = iter.find(func((_, p)) { p.coupleCode == code });

    switch (match) {
      case (null) { Runtime.trap("No matching code found") };
      case (?(partnerPrincipal, partnerProfile)) {
        if (partnerPrincipal == caller) {
          Runtime.trap("Cannot pair with yourself");
        };
        let currentUserUpdate = {
          callerProfile with
          paired = true;
          partner = ?partnerPrincipal;
        };

        let partnerUpdate = {
          partnerProfile with
          paired = true;
          partner = ?caller;
        };

        userProfiles.add(caller, currentUserUpdate);
        userProfiles.add(partnerPrincipal, partnerUpdate);
      };
    };
  };

  public query ({ caller }) func isPaired() : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can check pairing status");
    };
    switch (userProfiles.get(caller)) {
      case (null) { false };
      case (?profile) { profile.paired };
    };
  };

  public query ({ caller }) func getPartnerProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get partner profile");
    };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) {
        switch (profile.partner) {
          case (null) { null };
          case (?partnerPrincipal) {
            userProfiles.get(partnerPrincipal);
          };
        };
      };
    };
  };

  // ── messaging ──────────────────────────────────────────────────────────────

  public shared ({ caller }) func sendMessage(text : Text) : async () {
    // Only paired users may send messages to each other.
    requirePaired(caller);
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) {
        let newMessage : Message = {
          senderPrincipal = caller;
          senderUsername = profile.username;
          messageText = text;
          timestamp = Time.now().toText();
          read = false;
        };
        messages.add(newMessage);
      };
    };
  };

  public query ({ caller }) func getMessages(offset : ?Nat, limit : ?Nat) : async [Message] {
    // Only paired users may read the shared message history.
    requirePaired(caller);

    let messagesArray = messages.toArray();
    let totalMessages = messages.size();
    let actualLimit = switch (limit) {
      case (null) { 20 };
      case (?l) { l };
    };
    let startIndex = switch (offset) {
      case (null) { 0 };
      case (?o) { o };
    };
    if (totalMessages == 0 or startIndex >= totalMessages) {
      return [];
    };
    let endIndex = Nat.min(startIndex + actualLimit, totalMessages);
    messagesArray.sliceToArray(startIndex, endIndex);
  };

  public shared ({ caller }) func markMessagesRead() : async () {
    requirePaired(caller);
    let markMessage = func(message : Message) : Message { { message with read = true } };
    let markedMessages = messages.map<Message, Message>(markMessage);
    messages.clear();
    messages.addAll(markedMessages.values());
  };

  // ── photo gallery ──────────────────────────────────────────────────────────

  // Upload a photo blob.  Only the two paired users may call this.
  public shared ({ caller }) func uploadMedia(blob : Storage.ExternalBlob, mimeType : Text) : async Text {
    // Enforce: caller must be a paired user.
    requirePaired(caller);

    let uploaderUsername = switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?profile) { profile.username };
    };

    let newId = Time.now().toText();
    let newMediaItem : MediaItem = {
      id = newId;
      blob;
      mimeType;
      uploader = caller;
      uploaderUsername;
      timestampNanos = Time.now();
    };

    mediaItems.add(newId, newMediaItem);
    newId;
  };

  // Retrieve gallery items with pagination
  public query ({ caller }) func getGalleryMedia(offset : ?Nat, limit : ?Nat) : async [MediaItem] {
    requirePaired(caller);

    let itemsArray = mediaItems.toArray();
    let totalItems = mediaItems.size();
    let actualLimit = switch (limit) {
      case (null) { 12 };
      case (?l) { l };
    };
    let startIndex = switch (offset) {
      case (null) { 0 };
      case (?o) { o };
    };
    if (totalItems == 0 or startIndex >= totalItems) {
      return [];
    };
    let endIndex = Nat.min(startIndex + actualLimit, totalItems);
    itemsArray.sliceToArray(startIndex, endIndex).map<(Text, MediaItem), MediaItem>(
      func((_, item)) { item }
    );
  };

  // Delete a media item by id.  Only the two paired users may call this.
  public shared ({ caller }) func deleteMedia(id : Text) : async Bool {
    requirePaired(caller);
    switch (mediaItems.get(id)) {
      case (null) { Runtime.trap("No media with this id exists") };
      case (_) {
        mediaItems.remove(id);
        true;
      };
    };
  };

  // ── video call management ─────────────────────────────────────────────────

  public shared ({ caller }) func createCallSession(receiverId : Principal, callType : CallType) : async {
    #ok : CallSession;
    #err : Text;
  } {
    // Caller must be a paired user.
    requirePaired(caller);

    // Receiver must be the caller's actual partner.
    let partnerPrincipal = getPartnerPrincipal(caller);
    if (receiverId != partnerPrincipal) {
      return #err("Unauthorized: Can only create a call session with your partner");
    };

    switch ((userProfiles.get(caller), userProfiles.get(receiverId))) {
      case (?callerProfile, ?receiverProfile) {
        let sessionId = Time.now().toText();
        let newSession : CallSession = {
          id = sessionId;
          callerId = caller;
          callerUsername = callerProfile.username;
          receiverId;
          receiverUsername = receiverProfile.username;
          status = #calling;
          createdAt = Time.now();
          offerSDP = null;
          answerSDP = null;
          callerICE = [];
          receiverICE = [];
          callType;
        };
        callSessions.add(sessionId, newSession);
        #ok newSession;
      };
      case (_) {
        #err("Caller or receiver profile not found");
      };
    };
  };

  public shared ({ caller }) func updateCallStatus(sessionId : Text, status : CallStatus) : async {
    #ok;
    #err : Text;
  } {
    // Must be a registered user.
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Only users can update call status");
    };

    switch (callSessions.get(sessionId)) {
      case (null) { #err("Call session not found") };
      case (?session) {
        // Must be a participant of this specific session.
        if (caller != session.callerId and caller != session.receiverId) {
          return #err("Unauthorized: Not a participant of this call");
        };

        let updatedSession = { session with status };
        callSessions.add(sessionId, updatedSession);

        if (status == #ended or status == #declined) {
          let durationSeconds = Int.abs(Time.now() - session.createdAt) / 1_000_000_000;

          let historyItem : CallHistory = {
            id = sessionId;
            callerId = session.callerId;
            callerUsername = session.callerUsername;
            receiverId = session.receiverId;
            receiverUsername = session.receiverUsername;
            durationSeconds;
            timestamp = Time.now();
            status = switch (status) {
              case (#ended) { #ended };
              case (#declined) { #declined };
              case (_) { #missed };
            };
            callType = session.callType;
          };
          callHistory.add(historyItem);
        };

        #ok;
      };
    };
  };

  public shared ({ caller }) func setOffer(sessionId : Text, sdp : Text) : async {
    #ok;
    #err : Text;
  } {
    // Must be a registered user.
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Only users can set an offer");
    };

    switch (callSessions.get(sessionId)) {
      case (null) { #err("Call session not found") };
      case (?session) {
        // Only the caller of the session can set the offer.
        if (caller != session.callerId) {
          return #err("Unauthorized: Only the caller can set the offer");
        };

        let updatedSession = { session with offerSDP = ?sdp };
        callSessions.add(sessionId, updatedSession);
        #ok;
      };
    };
  };

  public shared ({ caller }) func setAnswer(sessionId : Text, sdp : Text) : async {
    #ok;
    #err : Text;
  } {
    // Must be a registered user.
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Only users can set an answer");
    };

    switch (callSessions.get(sessionId)) {
      case (null) { #err("Call session not found") };
      case (?session) {
        // Only the receiver of the session can set the answer.
        if (caller != session.receiverId) {
          return #err("Unauthorized: Only the receiver can set the answer");
        };

        let updatedSession = { session with answerSDP = ?sdp };
        callSessions.add(sessionId, updatedSession);
        #ok;
      };
    };
  };

  public shared ({ caller }) func addICECandidate(sessionId : Text, candidate : Text, isCallerCandidate : Bool) : async {
    #ok;
    #err : Text;
  } {
    // Must be a registered user.
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Only users can add ICE candidates");
    };

    switch (callSessions.get(sessionId)) {
      case (null) { #err("Call session not found") };
      case (?session) {
        // Must be a participant of this specific session.
        if (caller != session.callerId and caller != session.receiverId) {
          return #err("Unauthorized: Not a participant of this call");
        };

        let updatedSession = if (isCallerCandidate) {
          {
            session with
            callerICE = session.callerICE.concat([candidate]);
          };
        } else {
          {
            session with
            receiverICE = session.receiverICE.concat([candidate]);
          };
        };

        callSessions.add(sessionId, updatedSession);
        #ok;
      };
    };
  };

  public query ({ caller }) func getCallSession(sessionId : Text) : async ?CallSession {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get call sessions");
    };
    switch (callSessions.get(sessionId)) {
      case (null) { null };
      case (?session) {
        // Only participants of the session may retrieve it.
        if (caller != session.callerId and caller != session.receiverId) {
          Runtime.trap("Unauthorized: Not a participant of this call session");
        };
        ?session;
      };
    };
  };

  public query ({ caller }) func getActiveCallSession() : async ?CallSession {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get active call sessions");
    };

    // Only return an active session where the caller is a participant.
    let sessionsArray = callSessions.values().toArray();
    sessionsArray.find(
      func(session) {
        session.status == #active and
        (session.callerId == caller or session.receiverId == caller)
      }
    );
  };

  public query ({ caller }) func getCallHistory() : async [CallHistory] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get call history");
    };
    // Only return history records where the caller is a participant.
    let allHistory = callHistory.toArray();
    allHistory.filter(
      func(record) {
        record.callerId == caller or record.receiverId == caller
      }
    );
  };

  // ── account deletion ───────────────────────────────────────────────────────

  public shared ({ caller }) func deleteAllUserData() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Deletion is only allowed for users");
    };

    // Remove caller's profile.
    userProfiles.remove(caller);

    // Remove messages sent by caller.
    let retainedMessages = messages.filter(
      func(message : Message) : Bool { message.senderPrincipal != caller }
    );
    messages.clear();
    messages.addAll(retainedMessages.values());

    // Remove media uploaded by caller.
    let keysToDelete = List.empty<Text>();
    mediaItems.entries().forEach(
      func((key, media)) {
        if (media.uploader == caller) {
          keysToDelete.add(key);
        };
      }
    );
    keysToDelete.values().forEach(
      func(key) { mediaItems.remove(key) }
    );

    // Remove call sessions where caller is a participant.
    let remainingSessions = callSessions.filter(
      func(_id, session) {
        session.callerId != caller and session.receiverId != caller
      }
    );
    callSessions.clear();

    // Remove call history where caller is a participant.
    let remainingHistory = callHistory.filter(
      func(history) {
        history.callerId != caller and history.receiverId != caller
      }
    );
    callHistory.clear();
    callHistory.addAll(remainingHistory.values());
  };
};
