const OpportunitiesCard = () => {
  return (
    <div className="my-4 rounded-md bg-gray-100 p-4  text-center dark:bg-gray-800">
      <p className="text-md my-4 text-gray-700 dark:text-gray-300">
        I build and scale reliable production systems. Open to full-time and freelance work with
        U.S.-based teams that value ownership and execution.
      </p>
      <p className="text-md my-2 font-medium text-gray-700 dark:text-gray-300">
        Got something in mind?
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
