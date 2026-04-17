import React from "react";
import { TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "@/store/UserContext";
import { usePosts } from "@/hooks/usePosts";

interface Props {
  post: any;
  onDeleted?: (postId: string) => void;
  /** Extra options to show in the alert menu */
  extraOptions?: { text: string; onPress: () => void; style?: "default" | "cancel" | "destructive" }[];
}

export default function PostOptionsButton({ post, onDeleted, extraOptions = [] }: Props) {
  const router = useRouter();
  const { userId, isAdmin, isUniAdmin, user } = useUser();
  const { deletePost, updateCommentsStatus, togglePin } = usePosts();

  const isAuthor = post.authorId === userId;
  const isFacultyAdmin = isAdmin && post.facultyTag === user?.faculty;
  const canManage = isAuthor || isUniAdmin || isFacultyAdmin;

  if (!canManage) return null;

  const handlePress = () => {
    const options: any[] = [];

    // Edit option (Author or Admins)
    options.push({
      text: "แก้ไขโพสต์",
      onPress: () =>
        router.push({
          pathname: "/new-post",
          params: {
            editPostId: post.id,
            editContent: post.content ?? "",
            editVisibility: post.visibility ?? "PUBLIC",
          },
        } as any),
    });

    // Pin option (Admins only)
    if (isUniAdmin || isFacultyAdmin) {
      options.push({
        text: post.isPinned ? "เลิกปักหมุด" : "ปักหมุดประกาศ",
        onPress: () => togglePin(post.id, !!post.isPinned),
      });
    }

    // Comment toggle
    options.push({
      text: post.commentsEnabled ? "ปิดการคอมเมนต์" : "เปิดการคอมเมนต์",
      onPress: () => updateCommentsStatus(post.id, !post.commentsEnabled),
    });

    // Extra options passed from props
    extraOptions.forEach(opt => options.push(opt));

    // Delete option
    options.push({
      text: "ลบโพสต์",
      style: "destructive",
      onPress: () =>
        Alert.alert("ยืนยันการลบ", "คุณต้องการลบโพสต์นี้ถาวรใช่หรือไม่?", [
          { text: "ยกเลิก", style: "cancel" },
          {
            text: "ลบ",
            style: "destructive",
            onPress: async () => {
              try {
                await deletePost(post.id);
                onDeleted?.(post.id);
              } catch (err) {
                Alert.alert("Error", "ไม่สามารถลบโพสต์ได้");
              }
            },
          },
        ]),
    });

    options.push({ text: "ยกเลิก", style: "cancel" });

    Alert.alert("จัดการโพสต์", "กรุณาเลือกรายการที่ต้องการ", options);
  };

  return (
    <TouchableOpacity onPress={handlePress} className="w-8 h-8 items-center justify-center ml-1">
      <Feather name="more-horizontal" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}
