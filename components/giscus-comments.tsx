import Giscus from "@giscus/react";

export default function Comment() {
  return (
  <>
    <br />
    <hr />
    <br />
    {process.env.NEXT_PUBLIC_REPO && process.env.NEXT_PUBLIC_REPO_ID && process.env.NEXT_PUBLIC_CATEGORY_ID ? (
    <Giscus
      repo= {process.env.NEXT_PUBLIC_REPO as `${string}/${string}`}
      repoId= {process.env.NEXT_PUBLIC_REPO_ID}
      category="Announcements"
      categoryId= {process.env.NEXT_PUBLIC_CATEGORY_ID}
      mapping="pathname"
      reactionsEnabled="1"
      emitMetadata="0"
      theme="dark"
    />
    ) : null}
  </>
  );
}
