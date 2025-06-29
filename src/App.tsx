import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import type { JSX } from 'react';
import { useImagePreloader } from './hooks/useImagePreloader';
import { LoadingScreen } from './components/LoadingScreen';

interface LinkItem {
  label: string;
  image: string;
  component: JSX.Element;
  style?: React.CSSProperties;
  class?: string;
  filter?: string;
}

// Mouse position interface
interface MousePosition {
  x: number;
  y: number;
}

const BASE_URL = import.meta.env.BASE_URL;

// Listen Component with social media links
const ListenComponent = (
  <div className="flex justify-center items-center">
    <nav>
      <ul className="flex space-x-4 md:space-x-8 flex-row md:flex-row">
        <li>
          <a
            href="https://open.spotify.com/artist/5xJPKbHL8q0eMVKZJG1FvI?si=XNTyE-pmQk2dRt4DvsMERg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i
              className="fa-brands fa-spotify text-4xl md:text-6xl  hover:text-grey-300 hover:animate-pulse transition-colors duration-300"
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
              className="fa-brands fa-apple text-4xl md:text-6xl  hover:text-gray-300 hover:animate-pulse transition-colors duration-300"
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
              className="fa-brands fa-tiktok text-4xl md:text-6xl  hover:text-gray-300 hover:animate-pulse transition-colors duration-300"
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
              className="fa-brands fa-youtube text-4xl md:text-6xl  hover:text-gray-300 hover:animate-pulse transition-colors duration-300"
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
              className="fa-brands fa-instagram text-4xl md:text-6xl  hover:text-gray-300 hover:animate-pulse transition-colors duration-300"
              title="Instagram"
            ></i>
          </a>
        </li>
      </ul>
    </nav>
  </div>
);

// About Component with navigation
const AboutComponent = (
  <div className="nav-component">
    <nav>
      <ul>
        <li>
          <a href="#">Press Kit</a>
        </li>
        <li>
          <a href="/about">Biography</a>
        </li>
        <li>
          <a href="#">Shows</a>
        </li>
        <li>
          <a href="#">News</a>
        </li>
      </ul>
    </nav>
  </div>
);

// Contact Component with contact options
const ContactComponent = (
  <div className="nav-component">
    <nav>
      <ul>
        <li>
          <a href="mailto:erfo250@gmail.com">Email</a>
        </li>
        <li>
          <a href="/mailing">Join the Mailing List</a>
        </li>
      </ul>
    </nav>
  </div>
);

// More Component with additional links
const MoreComponent = (
  <div className="nav-component">
    <nav>
      <ul>
        <li>
          <a href="#">Arts</a>
        </li>
        <li>
          <a href="#">Writing</a>
        </li>
        <li>
          <a href="#">Cool Stuff</a>
        </li>
      </ul>
    </nav>
  </div>
);

const LINK_ITEMS: LinkItem[] = [
  {
    label: 'Listen',
    image: '1.jpg',
    component: ListenComponent,
    style: {
      backgroundPosition: 'center',
      backgroundSize: '100% auto',
    },
    filter: 'contrast(1.2) brightness(0.8) grayscale(0.3)',
  },
  {
    label: 'About',
    image: '2.png',
    component: AboutComponent,
    style: {
      backgroundPosition: '10% 18%',
      backgroundSize: '45% auto',
    },
  },
  {
    label: 'Contact',
    image: '3.jpg',
    component: ContactComponent,
    style: {
      backgroundPosition: '70% 7%',
      backgroundSize: '90% auto',
    },
    class: 'contact-component',
    filter: 'invert(1) contrast(1.3) brightness(70%)',
  },
  {
    label: 'Extras',
    image: '4.jpg',
    component: MoreComponent,
    style: {
      backgroundPosition: '10% 50%',
      backgroundSize: '90% auto',
    },
  },
];

function App() {
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showLoading, setShowLoading] = useState(true);

  // Collect all image sources that need to be preloaded
  const imagesToPreload = [
    ...LINK_ITEMS.map((item) => `${BASE_URL}img/${item.image}`),
    `${BASE_URL}img/tex/paper-rip-h.png`,
    `${BASE_URL}img/tex/paper-rip-v.png`,
    `${BASE_URL}img/tex/spotlight-bg.jpg`,
    `${BASE_URL}/img/album_covers/fsqs-cover.jpg`,
  ];

  // Use our custom hook to preload images
  const { imagesLoaded, error, progress } = useImagePreloader(imagesToPreload);

  // Handle loading state transition
  useEffect(() => {
    if (imagesLoaded) {
      // Add a small delay before hiding the loading screen
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [imagesLoaded]);

  // Mouse move handler for parallax effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-display">Error loading images</h2>
          <p className="mt-2">Please refresh the page to try again</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <LoadingScreen progress={progress} isVisible={showLoading} />
      <main className="overflow-clip">
        <div className="flex flex-col md:flex-row min-h-screen w-screen">
          {/* Links section */}
          <div className="w-full md:w-[60%] flex flex-col md:justify-around relative links-section">
            {LINK_ITEMS.map((item) => (
              <div
                key={item.label}
                className={`${item.class ?? ''} link-item flex object-cover justify-center items-center font-display text-white h-42 md:h-full relative overflow-hidden`}
                tabIndex={0}
                role="button"
                aria-label={`Navigate to ${item.label} section`}
                onMouseEnter={() => setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
                onMouseMove={handleMouseMove}
              >
                {/* Background image with filter */}
                <div
                  className="link-item-background absolute inset-0 bg-no-repeat bg-black brand-filter transition-transform duration-200 ease-out will-change-transform"
                  style={
                    {
                      ...item.style,
                      backgroundImage: `url(${BASE_URL}img/${item.image})`,
                      '--individual-filter': item.filter || 'brightness(100%)',
                      transform:
                        hoveredItem === item.label
                          ? `scale(1.3) translate(${mousePos.x * -10}px, ${mousePos.y * -10}px)`
                          : 'scale(1.2)',
                    } as React.CSSProperties
                  }
                />

                {/* Darkening overlay */}
                <div className="link-item-overlay absolute inset-0 bg-black opacity-0 transition-opacity duration-300" />

                {/* Content layer */}
                <div className="link-item-content relative z-10 w-full h-full flex justify-center items-center text-yellow-50">
                  <div className="link-item-component opacity-0">
                    {item.component}
                  </div>
                  <div className="link-item-label text-6xl">{item.label}</div>
                </div>
              </div>
            ))}
            {/* Paper rip separator -- Mobile Screens */}
            <img
              className="paper-rip-separator-h object-cover absolute"
              src={`${BASE_URL}img/tex/paper-rip-h.png`}
              role="presentation"
              loading="eager"
            ></img>
          </div>

          {/* Spotlight section*/}
          <div className="w-full md:w-[40%] flex flex-col justify-center items-center p-8 relative md:pt-8 pt-12">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url(${BASE_URL}img/tex/spotlight-bg.jpg)`,
                filter: `invert(1) brightness(0.4) sepia(1)`,
              }}
            />
            <div className="flex flex-col justify-center items-center z-10 relative">
              <h2 className="text-center font-courier text-xl md:text-2xl text-gray-800 mb-4">
                LATEST RELEASE
              </h2>

              <div className="spotlight_project mb-6">
                <a
                  href="https://open.spotify.com/album/0soacY8sJH7jiRBRiEght1?si=_I8hn5T2RRugMNNLZzB_rA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block transition-transform duration-300 hover:scale-105"
                >
                  <img
                    src={`${BASE_URL}/img/album_covers/latest-release.jpg`}
                    alt="Album Cover for Frail Things"
                    className="block mx-auto w-64 md:w-96 border-8 border-gray-300 border-double hover:border-gray-400 transition-all duration-300 hover:shadow-2xl"
                    loading="eager"
                  />
                </a>
              </div>
            </div>
          </div>

          {/* Paper rip separator -- large screens*/}
          <img
            className="paper-rip-separator absolute object-cover right-[40%]"
            src={`${BASE_URL}img/tex/paper-rip-v.png`}
            role="presentation"
            loading="eager"
          ></img>
        </div>
      </main>
    </>
  );
}

export default App;
