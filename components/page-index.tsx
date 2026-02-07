import {
    getPagesUnderRoute,
} from "nextra/context";
import { Cards } from "nextra/components";
import { BookMarkedIcon } from "lucide-react";

function PageIndex({
    pageRoot,
}: {
    pageRoot: string;
}) {
    const pages = getPagesUnderRoute(pageRoot);

    return (
        <Cards>
            {
                pages.map((page, i) => {
                    // Skip directories with no index page
                    if ((page as any).kind !== "MdxPage") return null;

                    const title = page.meta?.title || page.name;
                    const route = page.route;

                    return (
                        <Cards.Card
                            key={i}
                            icon={<BookMarkedIcon />}
                            title={title}
                            href={route}
                        >{null}</Cards.Card>
                    );
                })
            }
        </Cards>
    );
}

export default PageIndex;