import React from "react";
import { TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "@/store/UserContext";
import { usePosts } from "@/hooks/usePosts";

interface Props {
  post: any;
  onDeleted?: (postId: string) => void;
}

export default function PostOptionsButton({ post, onDeleted }: Props) {
  const router = useRouter();
  const { userId } = useUser();
  const { deletePost, updateCommentsStatus } = usePosts();

  if (post.authorId !== userId) return null;

  const handlePress = () => {
    Alert.alert("จัดการโพสต์", "กรุณาเลือกรายการที่ต้องการ", [
      {
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
      },
      {
        text: post.commentsEnabled ? "ปิดการคอมเมนต์" : "เปิดการคอมเมนต์",
        onPress: () => updateCommentsStatus(post.id, !post.commentsEnabled),
      },
      {
        text: "ลบโพสต์",
        style: "destructive",
        onPress: () =>
          Alert.alert("ยืนยันการลบ", "คุณต้องการลบโพสต์นี้ถาวรใช่หรือไม่?", [
            { text: "ยกเลิก", style: "cancel" },
            {
              text: "ลบ",
              style: "destructive",
              onPress: async () => {
                await deletePost(post.id);
                onDeleted?.(post.id);
              },
            },
          ]),
      },
      { text: "ยกเลิก", style: "cancel" },
    ]);
  };

  return (
    <TouchableOpacity onPress={handlePress} className="w-8 h-8 items-center justify-center ml-1">
      <Feather name="more-horizontal" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}
