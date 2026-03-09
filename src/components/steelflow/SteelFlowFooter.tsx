import Link from "next/link";

export function SteelFlowFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 px-10 py-6 dark:border-slate-800">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 text-xs text-slate-400 sm:flex-row">
        <p>© 2023 SteelFlow Systems Ltd. Industrial Monitoring Platform.</p>
        <div className="flex gap-6">
          <Link className="transition-colors hover:text-primary" href="#">
            Privacy Policy
          </Link>
          <Link className="transition-colors hover:text-primary" href="#">
            System Status
          </Link>
          <Link className="transition-colors hover:text-primary" href="#">
            v2.4.1-stable
          </Link>
        </div>
      </div>
    </footer>
  );
}
