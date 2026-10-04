import MainCard from "@/components/MainCard";

const MainProject = ({ title, description, imgSrc, href }) => (
  <div className="xl:col-span-3">
    <div className="space-y-2 pt-6 pb-8 md:space-y-5">
      <h2 className="text-center text-2xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-3xl sm:leading-10 md:text-4xl md:leading-14 dark:text-gray-100">
        I built MonitorMe
      </h2>
      <p className="text-center text-lg leading-7 text-gray-500 dark:text-gray-400">
        An AI-powered tool that quickly spots bugs and performance issues in microservices.
      </p>
    </div>
    <MainCard key={title} title={title} description={description} imgSrc={imgSrc} href={href} />
  </div>
);

export default MainProject;
