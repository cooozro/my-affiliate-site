/**
 * Deterministic repairs so model-deep-dive drafts can actually publish:
 * missing Who should buy/skip, missing in-body /images/posts/ figure.
 * Safe for VPS scheduler, admin GitHub commit, and draft generation.
 */

export function repairModelDeepDiveBody(data, body, locale = "en") {
  const profile = data?.contentProfile;
  if (profile !== "model-deep-dive" || typeof body !== "string") {
    return { body, repairs: [] };
  }

  const repairs = [];
  let next = body;
  const brand = String(data.modelPickBrand ?? "").trim();
  const name = String(data.modelPickName ?? "").trim();
  const model =
    [brand, name].filter(Boolean).join(" ") ||
    (locale === "ko" ? "이 제품" : "this model");

  const hasBuy = /(Who should buy|이런 분께 추천|이런 분에게 추천)/i.test(next);
  const hasSkip = /(Who should skip|이런 분은 패스)/i.test(next);
  if (!hasBuy || !hasSkip) {
    if (locale === "ko") {
      if (!hasBuy) {
        next += `\n\n## 이런 분께 추천\n\n- ${model}이 리뷰 속 사용 환경과 맞는 사람\n- 설치 조건·소음·전기요금을 산 뒤에 확인하고 싶은 사람\n`;
      }
      if (!hasSkip) {
        next += `\n\n## 이런 분은 패스\n\n- 다른 폼팩터(이동식·벽걸이 등)가 더 맞는 집\n- 창틀·전원 조건 때문에 설치 자체가 어려운 경우\n`;
      }
    } else {
      if (!hasBuy) {
        next += `\n\n## Who should buy\n\n- Shoppers whose room and install path match this ${model} review\n- Anyone who wants noise, power, and install limits before buying\n`;
      }
      if (!hasSkip) {
        next += `\n\n## Who should skip\n\n- A portable or split unit fits the space better\n- Window or power constraints make this install unrealistic\n`;
      }
    }
    repairs.push("added Who should buy/skip section");
  }

  const hasBodyImg = /!\[[^\]]*]\(\/images\/posts\/[^)]+\)/.test(next);
  const cover = typeof data.coverImage === "string" ? data.coverImage.trim() : "";
  if (!hasBodyImg && /^\/images\/posts\//.test(cover)) {
    const alt =
      locale === "ko"
        ? String(data.coverImageAltKo || data.coverImageAlt || model)
        : String(data.coverImageAlt || model);
    const credit = String(data.coverImageCredit || "").trim();
    const caption =
      locale === "ko"
        ? `\n*이미지: ${credit || "저작권 안전한 스톡"} — 제품/라이프스타일 컷.*\n`
        : `\n*Image: ${credit || "copyright-safe stock"} — product/lifestyle cut.*\n`;
    const block = `\n\n![${alt}](${cover})\n${caption}`;
    const firstH2 = next.search(/^##\s+/m);
    if (firstH2 >= 0) {
      const lineEnd = next.indexOf("\n", firstH2);
      const at = lineEnd >= 0 ? lineEnd : firstH2;
      next = next.slice(0, at) + block + next.slice(at);
    } else {
      next = `${block}\n${next}`;
    }
    repairs.push("inserted cover as in-body product image");
  }

  return { body: next, repairs };
}
