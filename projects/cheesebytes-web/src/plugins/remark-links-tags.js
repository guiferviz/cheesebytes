import { visit } from 'unist-util-visit';

export default function extractLinksTags() {
    return (tree) => {
        visit(tree, 'link', (node) => {
            // console.log(node);
        });
    };;
}
