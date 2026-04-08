import React, { useRef, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { updateProfilePicture } from "@/functions/updateProfilePicture";

export default function ProfilePictureUpload({ user, onUpdated }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await updateProfilePicture(formData);
    if (res?.data?.profile_picture_url) {
      onUpdated(res.data.profile_picture_url);
    }
    setLoading(false);
  };

  return (
    <div
      className="relative cursor-pointer group"
      onClick={() => !loading && inputRef.current?.click()}
      title="Change profile picture"
    >
      <Avatar className="w-10 h-10 shadow-md">
        {user?.profile_picture_url ? (
          <AvatarImage src={user.profile_picture_url} alt={user.full_name} />
        ) : (
          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white font-semibold text-sm">
            {user?.full_name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Camera className="w-4 h-4 text-white" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}