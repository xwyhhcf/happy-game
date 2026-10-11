"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./site.module.css";

const links = [
  { href: "/", label: "画廊", symbol: "▦" },
  { href: "/games", label: "列表", symbol: "☷" },
  { href: "/pick", label: "按人数选游", symbol: "♧" },
];

export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      className={mobile ? s.mobileNav : s.navigation}
      aria-label={mobile ? "手机导航" : "主要导航"}
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
        >
          {mobile && <span aria-hidden="true">{link.symbol}</span>}
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
