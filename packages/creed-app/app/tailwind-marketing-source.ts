/**
 * Landing class names kept next to `globals.css` so Tailwind still emits
 * them when Next compiles this stylesheet from `@creed/app` and the sibling
 * `../../creed-marketing` glob misses.
 */
const MARKETING_TAILWIND_SOURCE = `
-mt-[30vh] md:-mt-[34vh] pt-[13vh] md:pt-[12vh]
min-h-[94svh] min-h-[72svh] md:min-h-[76svh]
min-h-[380px] min-h-[420px] min-h-[360px] lg:min-h-[280px] min-h-[272px] min-h-[132px] min-h-[120px] md:min-h-[130px]
lg:aspect-square lg:aspect-[5/4] md:py-30
max-w-[70rem] max-w-[64rem] max-w-[60rem] max-w-[56rem] max-w-[52rem] max-w-[46rem] max-w-[440px] max-w-[390px] md:max-w-[72rem]
min-w-[38rem] md:min-w-[44rem] w-[38%] md:w-[44%] w-[15.5%] md:w-[14%] sm:w-[340px]
text-[2.75rem] md:text-[3.25rem] text-[1.35rem] text-[1.55rem] md:text-[1.85rem] leading-[1.12] leading-[1.7]
text-[0.8em] text-[10px] text-[11px] text-[12px] text-[13px] text-[14px] text-[15px] text-[16px] md:text-[18px]
tracking-[-0.045em] tracking-[-0.025em] tracking-[-0.01em] tracking-[0.08em]
mx-[0.04em] translate-x-[3px] translate-y-[-0.012em] translate-y-[1px]
rounded-[28px] rounded-[8px] rounded-[6px] rounded-[5px] rounded-[3px]
shadow-[0_10px_30px_rgba(28,28,26,0.10)] [overflow-anchor:none]
scale-[0.82] scale-[0.84] scale-[0.86] scale-[0.88] scale-[0.9] scale-[0.92] scale-[0.94] scale-[1.02] scale-95
hover:bg-[#f6f7fb] text-[#19345f] text-[#DB2777] bg-[#DB2777] bg-[#FCE7F3]
dark:bg-[#3F1230] dark:text-[#F472B6]
bg-[linear-gradient(180deg,rgba(15,31,60,0.18)_0%,rgba(15,31,60,0.08)_30%,rgba(15,31,60,0)_60%)]
dark:bg-[linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.16)_30%,rgba(0,0,0,0)_60%)]
bg-[radial-gradient(92%_54%_at_50%_50%,rgba(0,0,0,0.16)_0%,rgba(0,0,0,0.05)_46%,rgba(0,0,0,0)_70%)]
bg-[#F3F4F6] bg-[#FFF1E7] bg-[#EFF6FF] bg-[#FFFBEB] bg-[#F5F3FF] bg-[#FEF2F2]
dark:bg-[#1f1f1d] dark:bg-[#3a1f12]/55 dark:bg-[#102341]/60 dark:bg-[#252932]/70 dark:bg-[#3a2a12]/50 dark:bg-[#2d1b45]/55 dark:bg-[#3F1212]/50
text-[#1F1F1A] text-[#C2410C] text-[#4B5563] text-[#B45309] text-[#6D28D9] text-[#DC2626]
dark:text-[#e7e7e2] dark:text-[#FB923C] dark:text-[#60A5FA] dark:text-[#D1D5DB] dark:text-[#FBBF24] dark:text-[#A78BFA] dark:text-[#F87171]
text-[var(--creed-accent-hover)]
`;

void MARKETING_TAILWIND_SOURCE;
