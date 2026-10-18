"use client";

import Link from "next/link";
import { usePrivacy } from "@/stores/privacy";

/** Per-phone privacy switches: hide amounts, discreet notifications. */
export function PrivacyCard() {
  const hideMoney = usePrivacy((s) => s.hideMoney);
  const setHideMoney = usePrivacy((s) => s.setHideMoney);
  const discreet = usePrivacy((s) => s.discreetNotifications);
  const setDiscreet = usePrivacy((s) => s.setDiscreetNotifications);
  const reports = usePrivacy((s) => s.errorReports);
  const setReports = usePrivacy((s) => s.setErrorReports);

  return (
    <section className="surface space-y-2 p-4">
      <div className="mb-1 text-[11px] font-bold section-label text-text-3">Privasi di HP ini</div>
      <Toggle
        label="Sembunyikan nominal"
        sub="Semua jumlah uang tampil Rp ••• — juga bisa lewat ikon mata di Uang kita."
        on={hideMoney}
        onChange={setHideMoney}
      />
      <Toggle
        label="Notifikasi samaran"
        sub={`Notifikasi cuma bilang "Ada kabar baru", isinya tidak muncul di layar kunci.`}
        on={discreet}
        onChange={setDiscreet}
      />
      <Toggle
        label="Kirim laporan error"
        sub="Kalau app error, kirim pesan error-nya tanpa nama, email, atau isi catatan. Membantu memperbaiki bug."
        on={reports}
        onChange={setReports}
      />
      <Link href="/privasi" className="block pt-1 text-[12px] font-medium text-text-3 underline-offset-2 active:opacity-60">
        Kebijakan privasi ›
      </Link>
    </section>
  );
}

function Toggle({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl bg-bg-elev1 px-3 py-2.5">
      <span>
        <span className="block text-[14px] font-semibold text-text-1">{label}</span>
        <span className="block text-[12px] text-text-3">{sub}</span>
      </span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-[color:var(--accent)]" />
    </label>
  );
}
