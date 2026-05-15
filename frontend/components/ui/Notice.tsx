export type NoticeType = "success" | "error" | "info";

type NoticeProps = {
  type: NoticeType;
  message: string;
};

export default function Notice({ type, message }: NoticeProps) {
  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
        type === "success"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : type === "error"
          ? "border-red-500/40 bg-red-500/10 text-red-300"
          : "border-blue-500/40 bg-blue-500/10 text-blue-300"
      }`}
    >
      {message}
    </div>
  );
}