import { Link } from '@tanstack/react-router';

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
          <h1 className="text-3xl lg:text-5xl font-display text-yellow-50 mb-4">
            THANK YOU!
          </h1>

          <p className="text-lg lg:text-xl font-courier text-yellow-50 mb-6">
            We've received your submission and will be in touch soon.
          </p>

          <div
            className="w-48 lg:w-64 h-0.5 bg-yellow-50 mx-auto my-6"
            role="separator"
            aria-orientation="horizontal"
          />

          <p className="text-base lg:text-lg font-courier text-yellow-50/80 mb-8">
            Keep an eye on your inbox for updates from Eric Folino.
          </p>

          <Link
            to="/"
            className="inline-block px-8 py-3 bg-yellow-50 text-black font-courier uppercase font-bold hover:brightness-75 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:scale-105"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
