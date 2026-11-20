import {
  FlameIcon,
  PresentationIcon,
  SparklesIcon,
  TrendingUpIcon,
} from "lucide-react";

/** A stylised product mock — the "screenshot" for the hero (pure CSS). */
export const AppPreview = () => (
  <div className="relative mx-auto w-full max-w-lg">
    <div
      aria-hidden="true"
      className="rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl shadow-teal-900/10 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <span className="size-2.5 rounded-full bg-rose-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 truncate rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-400 dark:bg-slate-800">
          app.pixelspace.my/chat
        </span>
      </div>
      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-[#1b8a7f] px-3 py-2 text-xs text-white">
          Jana 8 kad imbas untuk bab Kitaran Air 💧
        </div>
        <div className="mt-3 w-fit max-w-[92%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#177e89] dark:text-[#8fd9c8]">
            <SparklesIcon className="size-3.5" /> Kad imbas dijana
          </p>
          <div className="mt-2 rounded-xl border border-dashed border-teal-300 bg-teal-50/60 p-2.5 dark:border-teal-800 dark:bg-teal-950/30">
            <p className="text-[10px] tracking-wide text-slate-400 uppercase">
              Soalan
            </p>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Apakah proses air bertukar menjadi wap?
            </p>
          </div>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Dikuasai
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Ulang kaji
            </span>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <span
              key={index}
              className={
                index < 3
                  ? "h-1.5 w-6 rounded-full bg-[#1b8a7f]"
                  : "h-1.5 w-6 rounded-full bg-slate-200 dark:bg-slate-700"
              }
            />
          ))}
        </div>
      </div>
    </div>

    <div className="absolute -top-4 -left-4 hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg sm:flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <FlameIcon className="size-4 text-orange-500" />3 hari rentetan
    </div>
    <div className="absolute top-1/3 -right-4 hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg sm:flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <PresentationIcon className="size-4 text-violet-500" />
      Slaid dijana AI
    </div>
    <div className="absolute -bottom-5 left-8 hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg sm:flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <TrendingUpIcon className="size-4 text-teal-500" />
      Kuiz 6/8 betul
    </div>
  </div>
);
