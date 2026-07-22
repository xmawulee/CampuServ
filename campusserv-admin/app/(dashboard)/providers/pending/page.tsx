"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getFullFileUrl } from "@/lib/api";
import {
  Loader2,
  Check,
  X,
  Maximize2,
  AlertTriangle,
  Info,
  UserCheck,
  UserX,
  RefreshCw,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export interface PendingProvider {
  id: string;
  email: string;
  fullName: string;
  role: string;
  serviceCategory: string | null;
  isVerified: boolean;
  verificationStatus: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
  studentIdPhotoUrl: string | null;
  profilePictureUrl: string | null;
  accountStatus: string;
  createdAt: string;
  updatedAt: string;
  rejectionCount: number;
}

export interface PendingProviderResponse {
  user: PendingProvider;
  duplicateAccounts: string[];
}

const VerificationImage = ({ src, onZoom }: { src: string; onZoom: () => void }) => {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-200 group max-w-md bg-slate-50 min-h-[200px] flex items-center justify-center">
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 font-medium animate-pulse">
          <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
          <span className="text-sm">Loading image...</span>
        </div>
      )}
      
      {status === "error" ? (
        <div className="flex flex-col items-center justify-center text-red-400 p-6 text-center">
          <AlertTriangle className="w-8 h-8 mb-2" />
          <span className="text-sm font-medium">Image failed to load</span>
          <button 
            type="button"
            onClick={() => setStatus("loading")}
            className="mt-3 px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={status === "loading" ? `${src}#${Date.now()}` : src}
            alt="Student ID Verification"
            className={`w-full object-contain max-h-[300px] transition-opacity duration-300 ${status === "loading" ? "opacity-0" : "opacity-100"}`}
            onLoad={() => setStatus("success")}
            onError={() => setStatus("error")}
          />
          {status === "success" && (
            <button
              type="button"
              onClick={onZoom}
              className="absolute bottom-3 right-3 p-2 bg-black/60 hover:bg-black/90 rounded-lg text-slate-900 font-bold transition-colors flex items-center gap-1.5 text-xs opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Maximize2 className="w-4 h-4" /> Zoom Document
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default function PendingProviders() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [notesError, setNotesError] = useState("");

  // Fetch pending providers queue
  const {
    data: providers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PendingProviderResponse[]>({
    queryKey: ["admin", "providers", "pending"],
    queryFn: async () => {
      const res = await api.get("/admin/providers/pending");
      return res.data || [];
    },
  });

  // Sort queue: oldest first (submittedAt/createdAt ascending)
  const sortedProviders = [...providers].sort(
    (a, b) => new Date(a.user.createdAt).getTime() - new Date(b.user.createdAt).getTime()
  );

  const selectedProviderResponse = sortedProviders.find((p) => p.user.id === selectedId) || null;
  const selectedProvider = selectedProviderResponse?.user || null;
  const duplicateAccounts = selectedProviderResponse?.duplicateAccounts || [];

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (providerId: string) => {
      console.log("Firing Approve Mutation for:", providerId);
      await api.post(`/admin/providers/${providerId}/approve`);
    },
    onSuccess: () => {
      console.log("Approve successful");
      toast.success("Provider approved successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin", "providers", "pending"] });
      setSelectedId(null);
      setIsApproveOpen(false);
    },
    onError: (error: unknown) => {
      console.error("Approve failed:", error);
      let msg = "Failed to approve provider application.";
      if (isAxiosError(error)) {
        msg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : error.message);
      } else if (error instanceof Error) {
        msg = error.message;
      }
      toast.error(msg);
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({
      providerId,
      reason,
    }: {
      providerId: string;
      reason: string;
    }) => {
      console.log("Firing Reject Mutation for:", providerId, reason);
      await api.post(`/admin/providers/${providerId}/reject`, { reason });
    },
    onSuccess: () => {
      console.log("Reject successful");
      toast.success("Provider application rejected.");
      queryClient.invalidateQueries({ queryKey: ["admin", "providers", "pending"] });
      setSelectedId(null);
      setRejectionNotes("");
      setIsRejectOpen(false);
    },
    onError: (error: unknown) => {
      console.error("Reject failed:", error);
      let msg = "Failed to reject provider application.";
      if (isAxiosError(error)) {
        msg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : error.message);
      } else if (error instanceof Error) {
        msg = error.message;
      }
      toast.error(msg);
    },
  });

  const handleApproveConfirm = () => {
    if (selectedId) {
      approveMutation.mutate(selectedId);
    }
  };

  const handleRejectConfirm = () => {
    if (!rejectionNotes.trim()) {
      setNotesError("Rejection reason notes are required.");
      return;
    }
    if (rejectionNotes.trim().length < 10) {
      setNotesError("Please provide a detailed reason (at least 10 characters).");
      return;
    }
    setNotesError("");
    if (selectedId) {
      rejectMutation.mutate({ providerId: selectedId, reason: rejectionNotes });
    }
  };

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 h-[calc(100vh-112px)]">
        <h1 className="text-2xl font-bold text-slate-900 font-bold">Pending Approvals</h1>
        <div className="flex gap-6 flex-1 min-h-0">
          {/* Left panel skeleton */}
          <div className="w-1/3 bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl flex flex-col p-4 space-y-4">
            <div className="h-6 bg-white/10 rounded w-1/2 animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-slate-50 border border-gray-100 rounded-lg space-y-2 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                  <div className="h-5 bg-white/5 rounded w-1/4" />
                </div>
              ))}
            </div>
          </div>
          {/* Right panel skeleton */}
          <div className="flex-1 bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl p-6 space-y-6 animate-pulse">
            <div className="h-10 bg-white/10 rounded w-1/3" />
            <div className="h-4 bg-white/10 rounded w-1/4" />
            <div className="h-40 bg-white/5 rounded w-1/2" />
            <div className="h-10 bg-white/10 rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    let errorTitle = "Failed to load verification queue";
    let errorMessage = "An error occurred while fetching pending provider applications.";
    let buttonLabel = "Retry Connection";

    if (isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        const backendMsg = error.response.data?.message || (typeof error.response.data === 'string' ? error.response.data : (error.response.data?.error || null));
        errorTitle = `Server Error (HTTP ${status})`;
        errorMessage = backendMsg 
          ? `The backend server returned an error: ${backendMsg}`
          : `Server returned HTTP status ${status} while loading pending provider applications.`;
        buttonLabel = "Retry Request";
      } else if (error.request) {
        errorTitle = "Network Connection Failed";
        errorMessage = "Unable to reach CampuServ API gateway. Please check your network connection or server availability.";
        buttonLabel = "Retry Connection";
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return (
      <div className="flex h-[calc(100vh-112px)] flex-col items-center justify-center text-center p-6 bg-white shadow-sm border border-gray-100 rounded-2xl">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">{errorTitle}</h2>
        <p className="text-slate-500 font-medium mb-4 max-w-md">{errorMessage}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> {buttonLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-112px)]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 font-bold">Pending Approvals</h1>
        <div className="text-sm text-slate-500 font-medium bg-white shadow-sm border border-gray-100 rounded-2xl px-3 py-1.5 rounded-lg border border-gray-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>{providers.length} pending review</span>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Panel — Pending Queue */}
        <div className="w-1/3 bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900 font-bold">Verification Queue</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sortedProviders.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50/50 rounded-lg border border-gray-100">
                <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-900 font-bold mb-1">All caught up!</h3>
                <p className="text-sm text-slate-500 font-medium">No pending provider approvals at this time.</p>
              </div>
            ) : (
              sortedProviders.map((p) => {
                const isSelected = selectedId === p.user.id;
                const hasWarning = p.duplicateAccounts.length > 0 || (p.user.rejectionCount && p.user.rejectionCount > 0);
                
                return (
                  <div
                    key={p.user.id}
                    onClick={() => setSelectedId(p.user.id)}
                    className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-slate-50 border-l-4 border-l-accent-default border-y-slate-100 border-r-slate-100"
                        : "bg-slate-50 border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {p.user.profilePictureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.user.profilePictureUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-slate-900 font-bold font-medium">
                            {p.user.fullName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 font-bold truncate">
                            {p.user.fullName}
                          </h3>
                          {hasWarning && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate">
                          {p.user.email} {p.user.serviceCategory ? `• ${p.user.serviceCategory}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500 font-medium block">
                        {new Date(p.user.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel — Verification Detail */}
        <div className="flex-1 bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl overflow-hidden flex flex-col">
          {!selectedProvider ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-medium p-6 text-center">
              <Info className="w-12 h-12 mb-4 opacity-20 text-slate-900 font-bold" />
              <h3 className="font-semibold text-slate-900 font-bold mb-1">No Provider Selected</h3>
              <p className="text-sm max-w-xs">
                Select a pending application from the verification queue to review details.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-slate-50/35">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 font-bold mb-1">
                    {selectedProvider.fullName}
                  </h2>
                  <p className="text-slate-500 font-medium">
                    {selectedProvider.email}
                  </p>
                  {selectedProvider.serviceCategory && (
                    <span className="inline-block mt-2 px-2 py-1 bg-indigo-600/20 text-indigo-600 text-xs font-semibold rounded-md border border-accent-default/30">
                      {selectedProvider.serviceCategory}
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectionNotes("");
                      setNotesError("");
                      setIsRejectOpen(true);
                    }}
                    className="px-4 py-2 border border-red-500 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2 font-semibold text-sm"
                  >
                    <X className="w-4 h-4" /> Reject ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsApproveOpen(true)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-slate-900 font-bold rounded-lg transition-colors flex items-center gap-2 font-semibold text-sm"
                  >
                    <Check className="w-4 h-4" /> Approve ID
                  </button>
                </div>
              </div>

              {/* Detail Content */}
              <div className="p-6 space-y-8 flex-1">
                {/* Warnings */}
                {(duplicateAccounts.length > 0 || (selectedProvider.rejectionCount && selectedProvider.rejectionCount > 0)) && (
                  <div className="space-y-3">
                    {duplicateAccounts.length > 0 && (
                      <div className="flex items-start gap-3 bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold">Duplicate ID Photo Detected</p>
                          <p className="text-sm opacity-90 mt-1">This exact ID photo was also submitted by: {duplicateAccounts.join(", ")}</p>
                        </div>
                      </div>
                    )}
                    {selectedProvider.rejectionCount > 0 && (
                      <div className="flex items-start gap-3 bg-yellow-500/10 text-yellow-400 p-4 rounded-lg border border-yellow-500/20">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold">Prior Rejections: {selectedProvider.rejectionCount}</p>
                          <p className="text-sm opacity-90 mt-1">This user has previously been rejected. Review their application carefully.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* ID Verification Display */}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-slate-500 font-medium uppercase tracking-wider">
                      Student ID Document
                    </h3>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      selectedProvider.serviceCategory
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      Requested Category: {selectedProvider.serviceCategory || "Not yet selected"}
                    </span>
                  </div>
                  {selectedProvider.studentIdPhotoUrl ? (
                    <VerificationImage 
                      src={getFullFileUrl(selectedProvider.studentIdPhotoUrl)!} 
                      onZoom={() => setIsLightboxOpen(true)} 
                    />
                  ) : (
                    <div className="flex items-start gap-3 bg-yellow-500/10 text-yellow-400 p-4 rounded-lg border border-yellow-500/20 max-w-md">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="text-sm">
                        No Student ID photo was uploaded. Consider contacting the user or rejecting the application.
                      </p>
                    </div>
                  )}
                </div>

                {/* Account Details */}
                <div className="grid grid-cols-2 gap-4 max-w-2xl">
                  <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-xs text-slate-500 font-medium mb-1">
                      Verification Status
                    </span>
                    <span className="text-yellow-400 font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                      PENDING VERIFICATION
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-xs text-slate-500 font-medium mb-1">
                      Submitted On
                    </span>
                    <span className="text-slate-900 font-bold font-medium">
                      {new Date(selectedProvider.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for zoom */}
      {selectedProvider && selectedProvider.studentIdPhotoUrl && (
        <Lightbox
          open={isLightboxOpen}
          close={() => setIsLightboxOpen(false)}
          slides={[{ src: getFullFileUrl(selectedProvider.studentIdPhotoUrl)! }]}
        />
      )}

      {/* Approve Confirmation Modal */}
      {isApproveOpen && selectedProvider && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-200 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-green-400">
              <UserCheck className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 font-bold">Approve Provider Profile</h3>
            </div>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              Are you sure you want to approve **{selectedProvider.fullName}**? This will verify their profile and enable them to accept customer job requests.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={approveMutation.isPending}
                onClick={() => setIsApproveOpen(false)}
                className="px-4 py-2 border border-gray-200 text-slate-900 font-bold hover:bg-slate-50/50 rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approveMutation.isPending}
                onClick={handleApproveConfirm}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-slate-900 font-bold rounded-lg transition-colors font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Approving...
                  </>
                ) : (
                  "Confirm Approval"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectOpen && selectedProvider && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-200 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <UserX className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 font-bold">Reject Provider Profile</h3>
            </div>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              Please provide a clear reason why the student ID document uploaded by **{selectedProvider.fullName}** is being rejected. This feedback will be displayed to the user.
            </p>

            <div className="space-y-1">
              <textarea
                value={rejectionNotes}
                onChange={(e) => {
                  setRejectionNotes(e.target.value);
                  if (e.target.value.trim().length >= 10) setNotesError("");
                }}
                placeholder="E.g., The student ID card is expired or blurry. Please upload a clear photo of your active student card."
                rows={4}
                className="w-full bg-slate-50 border border-gray-200 rounded-lg p-3 text-slate-900 font-bold placeholder:text-slate-500 font-medium focus:outline-none focus:border-red-500 text-sm"
              />
              {notesError && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {notesError}
                </span>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={() => setIsRejectOpen(false)}
                className="px-4 py-2 border border-gray-200 text-slate-900 font-bold hover:bg-slate-50/50 rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={handleRejectConfirm}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-slate-900 font-bold rounded-lg transition-colors font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {rejectMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Rejecting...
                  </>
                ) : (
                  "Confirm Rejection"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

