export const ALL_COMMANDS = [
  {
    id: "goto-home",
    title: "Go to Home",
    group: "Navigation",
    keywords: ["home", "main", "feed", "house"],
    action: (navigate) => navigate("/"),
  },
  {
    id: "goto-profile",
    title: "My Profile",
    group: "Navigation",
    keywords: ["profile", "me", "my page"],
    action: (navigate) => navigate("/profile"),
  },

  {
    id: "edit-name",
    title: "Edit Name",
    group: "Profile",
    keywords: ["edit", "name", "full", "rename", "update name"],
    action: (navigate) => navigate("/profile?modal=edit-name"),
  },
  {
    id: "change-password",
    title: "Change Password",
    group: "Security",
    keywords: ["password", "security", "update password"],
    action: (navigate) => navigate("/profile?modal=change-password"),
  },
  {
    id: "change-avatar",
    title: "Change Avatar",
    group: "Profile",
    keywords: [
      "avatar",
      "photo",
      "image",
      "picture",
      "upload",
      "profile picture",
    ],
    action: (navigate) => navigate("/profile?modal=change-avatar"),
  },

  {
    id: "delete-account",
    title: "Delete Account",
    group: "Security",
    keywords: [
      "delete",
      "remove",
      "account",
      "danger",
      "erase",
      "destroy",
      "profile",
    ],
    action: (navigate) => navigate("/profile?modal=delete-account"),
  },
];
