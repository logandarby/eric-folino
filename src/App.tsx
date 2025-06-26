import React from 'react';
import './App.css';
import type { JSX } from 'react';

interface LinkItem {
  label: string;
  image: string;
  component: JSX.Element;
  style?: React.CSSProperties;
}

function App() {
  const ListenComponent = <div>Listen</div>;

  const AboutComponent = <div>About</div>;

  const ContactComponent = <div>Contact</div>;

  const MoreComponent = <div>More</div>;

  const LINK_ITEMS: LinkItem[] = [
    {
      label: 'Listen',
      image: '1.jpg',
      component: ListenComponent,
      style: {
        backgroundPosition: '100% 30%',
      },
    },
    {
      label: 'About',
      image: '2.png',
      component: AboutComponent,
      style: {
        backgroundPosition: '-10% 25%',
        backgroundSize: 500,
      },
    },
    {
      label: 'Contact',
      image: '3.jpg',
      component: ContactComponent,
      style: {
        backgroundPosition: '80% 10%',
        backgroundSize: 930,
      },
    },
    {
      label: 'More',
      image: '4.jpg',
      component: MoreComponent,
      style: {
        backgroundPosition: '-300% 48%',
        backgroundSize: 900,
      },
    },
  ];

  return (
    <>
      <main>
        <div className="flex flex-row h-screen w-screen">
          <div className="w-[60%] flex flex-col justify-around">
            {LINK_ITEMS.map((item) => (
              <div
                className="link-item flex object-cover justify-center items-center font-propaganda text-white h-full relative"
                style={{
                  ...item.style,
                  backgroundImage: `url(${import.meta.env.BASE_URL}img/${item.image})`,
                }}
              >
                <div className="link-item-component opacity-0">
                  {item.component}
                </div>
                <div className="link-item-label text-8xl">{item.label}</div>
              </div>
            ))}
          </div>
          <div>Col2</div>
        </div>
      </main>
    </>
  );
}

export default App;
