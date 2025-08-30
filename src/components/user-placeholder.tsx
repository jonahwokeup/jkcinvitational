"use client";

interface UserPlaceholderProps {
  name: string | null;
  image: string | null;
  className?: string;
}

export function getUserPlaceholder(name: string | null, image: string | null) {
  if (image) {
    return (
      <img
        src={image}
        alt={name || "User"}
        className="w-full h-full object-cover rounded-full"
      />
    );
  }

  if (name) {
    return (
      <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-400 rounded-full flex items-center justify-center text-white font-medium text-sm">
      ?
    </div>
  );
}

export default function UserPlaceholder({ name, image, className = "w-8 h-8" }: UserPlaceholderProps) {
  return (
    <div className={className}>
      {getUserPlaceholder(name, image)}
    </div>
  );
}
