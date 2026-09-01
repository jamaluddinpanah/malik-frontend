"use client";
/* eslint-disable @next/next/no-img-element -- Listing media may use user-provided hosts that cannot be statically allowlisted. */

import { useState } from "react";
import type { ListingImage } from "@/features/listings/entities";
import styles from "./listing.module.css";

export function ListingGallery({ images, title, emptyLabel }: { images: ListingImage[]; title: string; emptyLabel: string }) {
  const [selected, setSelected] = useState(0);
  const image = images[selected] ?? images[0];
  if (!image) return <section className={styles.gallery}><div className={styles.imageEmpty}>{emptyLabel}</div></section>;
  return <section className={styles.gallery}>
    <img src={image.url} alt={image.alt || title} />
    {images.length > 1 ? <div>{images.map((item, index) => <button type="button" key={item.url} className={index === selected ? styles.thumbSelected : ""} onClick={() => setSelected(index)} aria-label={`View image ${index + 1}`}><img src={item.url} alt="" /></button>)}</div> : null}
  </section>;
}
