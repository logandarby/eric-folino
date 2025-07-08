import './HomePage.css';

// Listen Component with social media links
const ListenComponent = (
  <div className="flex justify-center items-center">
    <nav>
      <ul className="flex space-x-4 lg:space-x-5 flex-row lg:flex-row listencomponent">
        <li>
          <a
            href="https://open.spotify.com/artist/5xJPKbHL8q0eMVKZJG1FvI?si=XNTyE-pmQk2dRt4DvsMERg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i
              className="fa-brands fa-spotify text-4xl  hover:text-grey-300 hover:animate-pulse transition-colors duration-300"
              title="Spotify"
            ></i>
          </a>
        </li>
        <li>
          <a
            href="https://music.apple.com/ca/artist/eric-folino/1634985575"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i
              className="fa-brands fa-apple text-4xl  hover:text-gray-300 hover:animate-pulse transition-colors duration-300"
              title="Apple Music"
            ></i>
          </a>
        </li>
        <li>
          <a
            href="https://www.tiktok.com/@ericfolino"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i
              className="fa-brands fa-tiktok text-4xl  hover:text-gray-300 hover:animate-pulse transition-colors duration-300"
              title="TikTok"
            ></i>
          </a>
        </li>
        <li>
          <a
            href="https://www.youtube.com/channel/UCdR6ZNTxlyQN2Bw4iwdETQQ"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i
              className="fa-brands fa-youtube text-4xl  hover:text-gray-300 hover:animate-pulse transition-colors duration-300"
              title="YouTube"
            ></i>
          </a>
        </li>
        <li>
          <a
            href="https://www.instagram.com/eric.folino"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i
              className="fa-brands fa-instagram text-4xl  hover:text-gray-300 hover:animate-pulse transition-colors duration-300"
              title="Instagram"
            ></i>
          </a>
        </li>
      </ul>
    </nav>
  </div>
);

const HomePage = () => {
  return (
    <div className="fixed inset-0 bg-black lg:flex items-center justify-center lg:justify-around px-4 lg:px-15 backdrop-blur-2xl flex-col lg:flex-row gap-6 lg:gap-10 overflow-y-scroll lg:overflow-auto">
      <div className="lgp-5 flex-1 min-h-[80%] lg:h-auto text-yellow-50 text-center relative flex flex-col justify-center items-center w-auto lg:max-w-[60%]">
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
        <h2 className="text-xl lg:text-3xl font-display mb-4 relative z-10 max-w-sm lg:max-w-3xl">
          ERIC FOLINO WILL BE BACK WITH YOU SHORTLY
        </h2>
        <p className="text-lg lg:text-xl font-courier uppercase relative z-10"></p>
        <div
          className="w-48 lg:w-64 h-0.5 bg-yellow-50 mx-auto mt-4 lg:mt-6 relative z-10"
          role="separator"
          aria-orientation="horizontal"
        ></div>

        {/* SOCIAL MEDIA LINKS */}
        <div className="my-4 lg:my-6">{ListenComponent}</div>
      </div>
      {/* SIGNUP FORM */}
      <div className="p-5 flex-1 lg:flex-none flex flex-col justify-center lg:mb-0 mb-20">
        <h3 className="text-lg lg:text-2xl font-display-2 mb-6 text-yellow-50 text-center">
          sign up to see what's next
        </h3>
        <div className="max-w-md mx-auto space-y-4">
          <form
            method="post"
            action="https://sendfox.com/form/1wpy8j/1vderz"
            className="sendfox-form"
            id="1vderz"
            data-async="true"
            data-recaptcha="true"
          >
            <p>
              <label
                htmlFor="sendfox_form_name"
                className="text-yellow-50 text-sm lg:text-base font-courier uppercase mb-2 block"
              >
                First Name:{' '}
              </label>
              <input
                type="text"
                id="sendfox_form_name"
                placeholder="First Name"
                name="first_name"
                required
                className="w-full px-4 py-3 bg-transparent border-2 border-yellow-50 text-yellow-50 placeholder-yellow-50/50 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-yellow-300/20 focus:bg-yellow-50 focus:text-gray-900 focus:placeholder-gray-500 transition-all duration-300 font-courier"
              />
            </p>
            <p>
              <label
                htmlFor="sendfox_form_email"
                className="text-yellow-50 text-sm lg:text-base font-courier uppercase mb-2 block"
              >
                Email:{' '}
              </label>
              <input
                type="email"
                id="sendfox_form_email"
                placeholder="Email"
                name="email"
                required
                className="w-full px-4 py-3 bg-transparent border-2 border-yellow-50 text-yellow-50 placeholder-yellow-50/50 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-yellow-300/20 focus:bg-yellow-50 focus:text-gray-900 focus:placeholder-gray-500 transition-all duration-300 font-courier"
              />
            </p>
            {/* no botz please */}
            <div
              style={{ position: 'absolute', left: '-5000px' }}
              aria-hidden="true"
            >
              <input
                type="text"
                name="a_password"
                tabIndex={-1}
                value=""
                autoComplete="off"
              />
            </div>
            <p>
              <button
                type="submit"
                className="w-full mt-5 px-8 py-3 bg-yellow-50 text-black font-courier uppercase font-bold hover:brightness-75 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:scale-105"
              >
                Submit
              </button>
            </p>
          </form>
        </div>
      </div>
      {/* END OF SIGNUP FORM */}
    </div>
  );
};

export default HomePage;
