import Image from "./Image";
import Link from "./Link";
import Tag from "./Tag";

const WorkCard = ({ title, subtitle, description, imgSrc, href, type }) => (
  <div className="md max-w-[544px] p-4 md:w-1/2">
    <div
      className={`${
        imgSrc && "h-full"
      } overflow-hidden rounded-md border-2 border-gray-200 border-opacity-60 dark:border-gray-700`}
    >
      <Link href={href} aria-label={`Link to ${title}`}>
        <Image
          alt={title}
          src={imgSrc}
          className="object-cover object-center md:h-36 lg:h-48"
          width={544}
          height={180}
        />
      </Link>
      <div className="p-6">
        <h2 className="mb-3 text-2xl font-bold leading-8 tracking-tight">
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
              className="text-base font-medium leading-6 text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
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
