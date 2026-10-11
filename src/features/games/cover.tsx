"use client";

import { useState } from "react";
import s from "./site.module.css";

export function Cover({
  coverKey,
  name,
  large = false,
  eager = false,
}: {
  coverKey: string;
  name: string;
  large?: boolean;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className={s.placeholder}>封面暂时缺席</span>
  ) : (
    <img
      src={`/media/${large ? coverKey : coverKey.replace(".webp", "-thumb.webp")}`}
      alt={`${name}封面`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
