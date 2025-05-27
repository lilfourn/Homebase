export const LoadingState = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-lg text-gray-600">Loading course details...</p>
    </div>
  );
};

export const ErrorState = ({ error }: { error: string }) => {
  return (
    <div className="flex justify-center items-center h-screen bg-red-50">
      <p className="text-lg text-red-600 p-4 border border-red-300 rounded-md bg-white shadow-md">
        Error: {error}
      </p>
    </div>
  );
};

export const NoCourseState = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-lg text-gray-600">No course data to display.</p>
    </div>
  );
};
