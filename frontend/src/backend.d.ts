import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface CallHistory {
    id: string;
    status: Variant_missed_ended_declined;
    receiverUsername: string;
    callType: CallType;
    callerId: Principal;
    receiverId: Principal;
    callerUsername: string;
    durationSeconds: bigint;
    timestamp: bigint;
}
export interface CallSession {
    id: string;
    status: CallStatus;
    receiverICE: Array<string>;
    answerSDP?: string;
    createdAt: bigint;
    callerICE: Array<string>;
    receiverUsername: string;
    callType: CallType;
    callerId: Principal;
    receiverId: Principal;
    callerUsername: string;
    offerSDP?: string;
}
export interface Message {
    read: boolean;
    senderUsername: string;
    messageText: string;
    senderPrincipal: Principal;
    timestamp: string;
}
export interface MediaItem {
    id: string;
    blob: ExternalBlob;
    mimeType: string;
    uploaderUsername: string;
    uploader: Principal;
    timestampNanos: bigint;
}
export interface UserProfile {
    principal: Principal;
    username: string;
    coupleCode: string;
    paired: boolean;
    partner?: Principal;
}
export enum CallStatus {
    active = "active",
    calling = "calling",
    ended = "ended",
    declined = "declined"
}
export enum CallType {
    video = "video",
    voice = "voice"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_missed_ended_declined {
    missed = "missed",
    ended = "ended",
    declined = "declined"
}
export interface backendInterface {
    addICECandidate(sessionId: string, candidate: string, isCallerCandidate: boolean): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCallSession(receiverId: Principal, callType: CallType): Promise<{
        __kind__: "ok";
        ok: CallSession;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteAllUserData(): Promise<void>;
    deleteMedia(id: string): Promise<boolean>;
    generateCoupleCode(): Promise<void>;
    getActiveCallSession(): Promise<CallSession | null>;
    getCallHistory(): Promise<Array<CallHistory>>;
    getCallSession(sessionId: string): Promise<CallSession | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getGalleryMedia(offset: bigint | null, limit: bigint | null): Promise<Array<MediaItem>>;
    getMessages(offset: bigint | null, limit: bigint | null): Promise<Array<Message>>;
    getMyProfile(): Promise<UserProfile>;
    getPartnerProfile(): Promise<UserProfile | null>;
    getUserCount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isPaired(): Promise<boolean>;
    markMessagesRead(): Promise<void>;
    pairWithCode(code: string): Promise<void>;
    registerUser(username: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendMessage(text: string): Promise<void>;
    setAnswer(sessionId: string, sdp: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    setOffer(sessionId: string, sdp: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateCallStatus(sessionId: string, status: CallStatus): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    uploadMedia(blob: ExternalBlob, mimeType: string): Promise<string>;
}
