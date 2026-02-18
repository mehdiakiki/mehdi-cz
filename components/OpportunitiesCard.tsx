const OpportunitiesCard = () => {
  return (
    <div className="my-4 rounded-md bg-gray-100 p-4  text-center dark:bg-gray-800">
      <p className="text-md my-4 text-gray-700 dark:text-gray-300">
        I'm a software engineer focused on building and scaling reliable production systems. I work
        with startups and established teams on U.S.-based full-time roles and freelance projects
        where ownership and execution matter.
      </p>
      <p className="text-md my-2 text-gray-700 dark:text-gray-300">
        If you're evaluating a role or planning a project, start with a free 30-minute discovery
        call.
      </p>
      <a
        href="https://cal.com/mehdicz/30min"
        target="_blank"
        rel="noopener noreferrer"
        className="text-md inline-block rounded-md bg-primary-500 px-4 py-2 font-semibold text-white hover:bg-primary-600"
      >
        <span className="text-white">Book a Discovery Call</span>
      </a>
    </div>
  );
};

export default OpportunitiesCard;
