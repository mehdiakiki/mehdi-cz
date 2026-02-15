import Image from "./Image";
import Link from "./Link";

const MainCard = ({ title, description, imgSrc, href }) => (
  <div className="md max-w-[1088px] p-0 md:w-full">
    <div className={`${imgSrc && "h-full"} overflow-hidden`}>
      <Link href={href} aria-label={`Link to ${title}`} style={{ maxWidth: 1088 }}>
        <Image
          alt={title}
          src={imgSrc}
          className="h-100 m-0 rounded-md object-cover object-center"
          width={2000}
          height={1000}
        />
      </Link>
      <div className="p-6 text-center">
        <h2 className="mb-3 mt-3 text-2xl font-bold leading-8 tracking-tight">
          {href ? (
            <Link href={href} aria-label={`Link to ${title}`}>
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        <p className="prose mb-3 max-w-none text-gray-500 dark:text-gray-400">{description}</p>
        {href && (
          <Link
            href={href}
            className="text-base font-medium leading-6 text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
            aria-label={`Link to ${title}`}
          >
            Read the case study &rarr;
          </Link>
        )}
      </div>
    </div>
  </div>
);

export default MainCard;
