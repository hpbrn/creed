import { useRef, useState, type ReactNode } from "react";
import Image from "@/lib/native/image";
import { DelayedSpinner } from "@/components/ui/delayed-spinner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UploadIcon, type UploadIconHandle } from "@/components/ui/upload";
import { cn } from "@/components/ui/utils";

export type ProfileAvatarKind = "person" | "shared";

function avatarLetter(name: string): string {
  const ch = name.trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

export function SettingsProfileLayout({
  avatar,
  nameField,
  emailField,
}: {
  avatar: ReactNode;
  nameField: ReactNode;
  emailField?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-4 md:gap-x-5 md:gap-y-5">
      {avatar}
      <div className="contents">
        <div className="min-w-0">{nameField}</div>
        {emailField ? (
          <div className="col-span-2 min-w-0">{emailField}</div>
        ) : null}
      </div>
    </div>
  );
}

const SIZE_CLASS = {
  sm: "size-6! rounded-[8px] after:rounded-[8px]",
  md: "size-9! rounded-sm after:rounded-sm",
  lg: "size-40! rounded-[26px] after:rounded-[26px]",
  input: "size-11! rounded-xl after:rounded-xl",
  // Matches Name label + gap + h-11 input (leading-5 + mb-2 + 2.75rem).
  responsive: "size-[4.5rem]! rounded-[18px] after:rounded-[18px]",
} as const;

const IMAGE_RADIUS = {
  sm: "rounded-[8px]",
  md: "rounded-sm",
  lg: "rounded-[26px]",
  input: "rounded-xl",
  responsive: "rounded-[18px]",
} as const;

export function ProfileAvatar({
  name,
  initials,
  avatarUrl,
  size = "md",
  className,
  fallback,
}: {
  kind: ProfileAvatarKind;
  name: string;
  initials?: string;
  avatarUrl?: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  fallback?: ReactNode;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl) && failedUrl !== avatarUrl;
  const letterSource = name.trim() || initials?.trim() || "";
  const fallbackText = avatarLetter(letterSource);

  return (
    <Avatar
      className={cn(
        "shrink-0 overflow-hidden border border-[var(--creed-border)] bg-[var(--creed-surface-raised)] [container-type:inline-size]",
        !showImage &&
          "bg-[var(--creed-surface-raised)] text-[var(--creed-text-primary)]",
        SIZE_CLASS[size],
        className,
      )}
    >
      {showImage && avatarUrl ? (
        <Image
          key={avatarUrl}
          src={avatarUrl}
          alt={name}
          fill
          className={cn("object-cover", IMAGE_RADIUS[size])}
          referrerPolicy="no-referrer"
          unoptimized
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        <AvatarFallback
          className={cn(
            "grid size-full place-items-center bg-transparent font-medium text-[var(--creed-text-primary)]",
            "text-[42cqw]",
            "leading-none tracking-normal",
          )}
        >
          <span className="block -translate-y-[0.04em] leading-none transition-opacity duration-150 group-hover/avatar-edit:opacity-0 group-focus-within/avatar-edit:opacity-0">
            {fallback ?? fallbackText}
          </span>
        </AvatarFallback>
      )}
    </Avatar>
  );
}

export function EditableProfileAvatar({
  kind,
  name,
  initials,
  avatarUrl,
  disabled,
  uploading,
  size = "responsive",
  onFile,
  fallback,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  uploadLabel,
}: {
  kind: ProfileAvatarKind;
  name: string;
  initials?: string;
  avatarUrl?: string;
  disabled?: boolean;
  uploading?: boolean;
  size?: keyof typeof SIZE_CLASS;
  onFile: (file: File) => void;
  fallback?: ReactNode;
  accept?: string;
  uploadLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const uploadIconRef = useRef<UploadIconHandle | null>(null);
  const overlayIconSize =
    size === "input" ? 16 : size === "sm" || size === "md" ? 18 : 30;
  const overlaySpinnerClass =
    size === "input" || size === "sm" || size === "md"
      ? "h-4 w-4 animate-spin text-white"
      : "h-7 w-7 animate-spin text-white";

  return (
    <div
      className={cn("group/avatar-edit relative shrink-0", SIZE_CLASS[size])}
    >
      <ProfileAvatar
        kind={kind}
        name={name}
        initials={initials}
        avatarUrl={avatarUrl}
        size={size}
        className="h-full w-full"
        fallback={fallback}
      />
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled || uploading}
        aria-label={
          uploadLabel ??
          `Upload ${kind === "shared" ? "shared" : "profile"} picture`
        }
        onClick={() => {
          inputRef.current?.click();
          requestAnimationFrame(() => buttonRef.current?.blur());
        }}
        onMouseEnter={() => uploadIconRef.current?.startAnimation()}
        onMouseLeave={() => uploadIconRef.current?.stopAnimation()}
        onFocus={() => uploadIconRef.current?.startAnimation()}
        onBlur={() => uploadIconRef.current?.stopAnimation()}
        className={cn(
          "group absolute inset-0 flex items-center justify-center transition-colors duration-150",
          IMAGE_RADIUS[size],
          disabled
            ? "cursor-not-allowed"
            : cn(
                "cursor-pointer hover:bg-black/18 focus-visible:bg-black/18 focus-visible:outline-none",
                uploading && "bg-black/35",
              ),
        )}
      >
        {disabled && !uploading ? null : (
          <DelayedSpinner
            pending={Boolean(uploading)}
            className={overlaySpinnerClass}
            fallback={
              <UploadIcon
                ref={uploadIconRef}
                size={overlayIconSize}
                className="text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            }
          />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
