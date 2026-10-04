import { slug } from "github-slugger";
import IntentLink from "./IntentLink";
interface Props {
  text: string;
}

const Tag = ({ text }: Props) => {
  return (
    <IntentLink
      href={`/blog/tags/${slug(text)}/page/1`}
      className="text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 mr-3 inline-flex min-h-6 min-w-6 items-center justify-center text-sm font-medium uppercase"
    >
      {text.split(" ").join("-")}
    </IntentLink>
  );
};

export default Tag;
