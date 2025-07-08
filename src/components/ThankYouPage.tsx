const ThankYouPage = () => {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center px-4 backdrop-blur-2xl">
      <div className="text-center relative flex flex-col justify-center items-center max-w-2xl">
        {/* Star background */}
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-50 opacity-10 -z-1 w-72 h-72 lg:w-[500px] lg:h-[500px]"
          style={{
            maskImage: 'url(/star.png)',
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: 'url(/star.png)',
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
          }}
        />

        {/* Thank you content */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-3xl lg:text-5xl font-display-2 text-yellow-50 mb-4">
            THANK YOU
          </h1>

          <p className="text-lg lg:text-xl font-courier text-yellow-50 mb-6">
            we'll be in touch soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
