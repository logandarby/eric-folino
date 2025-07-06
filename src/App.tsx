import './App.css';

const SIZE = '500px';

function App() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center px-8 backdrop-blur-2xl">
      <div className="text-yellow-50 text-center relative">
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-50 opacity-10"
          style={{
            maskImage: 'url(/star.png)',
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: 'url(/star.png)',
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            width: SIZE,
            height: SIZE,
          }}
        />
        <h2 className="text-2xl md:text-3xl font-display mb-4 relative z-10">
          ERIC FOLINO WILL BE BACK WITH YOU SHORTLY
        </h2>
        <p className="text-lg md:text-xl font-courier uppercase relative z-10"></p>
        <div className="w-64 h-0.5 bg-yellow-50 mx-auto mt-6 relative z-10"></div>
      </div>
    </div>
  );
}

export default App;
