import { getPageMap } from "nextra/page-map";
import { Cards } from "nextra/components";
import { BookMarkedIcon } from "lucide-react";

async function PageIndex({
    pageRoot,
}: {
    pageRoot: string;
}) {
    const pages = await getPageMap(pageRoot);

    return (
        <Cards>
            {
                pages.map((page, i) => {
                    // Skip meta entries and directories with no index page
                    if (!("route" in page) || ("children" in page && !("frontMatter" in page))) return null;

                    const title = ("title" in page && page.title) || page.name;
                    const route = page.route;

                    return (
                        <Cards.Card
                            key={i}
                            icon={<BookMarkedIcon />}
                            title={String(title)}
                            href={route}
                        >{null}</Cards.Card>
                    );
                })
            }
        </Cards>
    );
}

export default PageIndex;
