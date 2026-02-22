"use client";

import { useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/constants";

interface ImageUploadProps {
    value: string;          // current photo_url stored in DB
    onChange: (url: string) => void;
    token: string;
    disabled?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 5;

export function ImageUpload({ value, onChange, token, disabled }: ImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string>(value || "");

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate type
        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError("Only JPG, PNG, WebP, or GIF images are allowed.");
            return;
        }

        // Validate size
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`Image must be smaller than ${MAX_SIZE_MB}MB.`);
            return;
        }

        setError(null);
        setUploading(true);

        try {
            // 1. Get a presigned upload URL from the backend
            const presignRes = await fetch(
                `${API_BASE_URL}/_api/upload/presign?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!presignRes.ok) throw new Error("Failed to get upload URL");
            const { uploadUrl, publicUrl } = await presignRes.json() as {
                uploadUrl: string;
                publicUrl: string;
                key: string;
            };

            // 2. Upload directly to S3 using the presigned PUT URL
            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!uploadRes.ok) throw new Error("Upload to S3 failed");

            // 3. Show preview and call onChange with the final public URL
            setPreview(publicUrl);
            onChange(publicUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
            // reset input so same file can be re-selected if needed
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-2">
            {/* Preview */}
            <div
                className="w-full h-40 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer relative"
                onClick={() => !disabled && !uploading && inputRef.current?.click()}
            >
                {preview ? (
                    <img
                        src={preview}
                        alt="Product preview"
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                            e.currentTarget.src = "/mock/product-1.svg";
                        }}
                    />
                ) : (
                    <div className="text-center">
                        <svg className="w-10 h-10 text-gray-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-400">Click to upload image</p>
                        <p className="text-xs text-gray-300">JPG, PNG, WebP · max {MAX_SIZE_MB}MB</p>
                    </div>
                )}

                {/* Upload overlay */}
                {uploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Uploading…
                        </div>
                    </div>
                )}
            </div>

            {/* Change button (shown when there's already an image) */}
            {preview && !uploading && !disabled && (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="text-xs text-pink-600 hover:underline"
                >
                    Change image
                </button>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                className="hidden"
                onChange={handleFileChange}
                disabled={disabled || uploading}
            />
        </div>
    );
}
