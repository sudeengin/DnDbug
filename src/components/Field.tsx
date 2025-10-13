import React from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export default function Field({ label, ...rest }: Props) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-zinc-700">{label}</div>
      <textarea
        className="w-full rounded-2xl border border-zinc-200 bg-white p-3 outline-none focus:ring-2 focus:ring-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
        rows={rest.rows ?? 3}
        {...rest}
      />
    </label>
  );
}
