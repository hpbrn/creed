import type { ReactNode } from "react";
import {
  SkeletonBar,
  SkeletonScreen,
  SkeletonText,
} from "@/components/creed/loading-skeleton";

function Card({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mt-4 rounded-[var(--radius-xl)] border border-[var(--creed-border)] bg-[var(--creed-surface)] ${className ?? "p-5"}`}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div className="my-10 h-px bg-[var(--creed-border)]" />;
}

function Field({ labelWidth }: { labelWidth: string }) {
  return (
    <div>
      <SkeletonText preset="t14" width={labelWidth} className="mb-2" />
      <SkeletonBar className="h-11 w-full rounded-xl" />
    </div>
  );
}

export function SettingsLoading() {
  return (
    <SkeletonScreen>
      <div className="mx-auto max-w-3xl px-8 py-10 md:px-14">
        <SkeletonText preset="h1" width="w-[90px]" />

        <section className="mt-10">
          <SkeletonText preset="h2" width="w-[52px]" />
          <Card>
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-4 md:gap-x-5 md:gap-y-5">
              <SkeletonBar className="h-[4.5rem] w-[4.5rem] rounded-[18px]" />
              <div className="min-w-0">
                <Field labelWidth="w-[78px]" />
              </div>
            </div>
          </Card>
        </section>

        <Divider />

        <section>
          <SkeletonText preset="h2" width="w-[135px]" />
          <Card className="p-5 pb-4">
            <div className="flex items-center justify-between gap-5">
              <SkeletonText preset="t15" width="w-[71px]" />
              <SkeletonBar className="h-9 w-[92px] shrink-0 rounded-sm" />
            </div>
            <div className="mt-5 border-t border-[var(--creed-border)] pt-4">
              <div className="-my-2 flex items-center justify-between py-2">
                <SkeletonText preset="t14" width="w-[133px]" />
                <SkeletonBar className="h-4 w-4 shrink-0" />
              </div>
            </div>
          </Card>
        </section>

        <Divider />

        <section>
          <SkeletonText preset="h2" width="w-[90px]" />
          <Card>
            <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-stretch">
              <div className="flex flex-col gap-4">
                <div>
                  <SkeletonText
                    preset="t13"
                    width="w-[132px]"
                    className="mb-2"
                  />
                  <SkeletonBar className="h-11 w-full rounded-xl" />
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <SkeletonBar className="h-8 w-[52px] rounded-md" />
                  <SkeletonBar className="h-8 w-[52px] rounded-md" />
                </div>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-[var(--creed-border)] bg-[var(--creed-surface)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <SkeletonText preset="t13" width="w-[84px]" />
                    <SkeletonText
                      preset="fig30"
                      width="w-[72px]"
                      className="mt-2"
                    />
                  </div>
                  <SkeletonBar className="h-8 w-[104px] shrink-0 rounded-md" />
                </div>
                <SkeletonBar className="mt-5 h-[120px] w-full rounded-lg" />
              </div>
            </div>
          </Card>
        </section>

        <Divider />
      </div>
    </SkeletonScreen>
  );
}

export default SettingsLoading;
