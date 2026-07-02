import type { JsonLdThing } from "@/lib/seo/json-ld/types";

type JsonLdProps = {
  data: JsonLdThing;
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
