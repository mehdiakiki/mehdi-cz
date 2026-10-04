import Image from "./Image";
import Link from "./Link";
import Tag from "./Tag";

const WorkCard = ({ title, subtitle, description, imgSrc, href, type }) => (
  <div className="md max-w-[544px] p-4 md:w-1/2">
    <div
      className={`${
        imgSrc && "h-full"
      } overflow-hidden rounded-md border-2 border-gray-200/60 dark:border-gray-700/60`}
    >
      <Link href={href} aria-label={`Link to ${title}`}>
        <Image
          alt={title}
          src={imgSrc}
          className="object-cover object-center md:h-36 lg:h-48"
          width={544}
          height={180}
          sizes="(max-width: 767px) calc( 100vw - 2rem), (max-width: 1151px) calc( 50vw - 2rem), 512px"
        />
      </Link>
      <div className="p-6">
        <h2 className="mb-3 text-2xl leading-8 font-bold tracking-tight">
          {href ? (
            <Link href={href} aria-label={`Link to ${title}`}>
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        {subtitle && (
          <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
        <p className="prose mb-3 max-w-none text-gray-500 dark:text-gray-400">{description}</p>
        {href && (
          <div className="text-right">
            <Link
              href={href}
              className="text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 text-base leading-6 font-medium"
              aria-label={`Link to ${title}`}
            >
              Github's link &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  </div>
);
export default WorkCard;
