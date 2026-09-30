const stickerItems = Array.from({ length: 10 });

function TopSticker() {
  return (
    <div className="fixed top-0 left-0 z-60 h-12 w-full overflow-hidden bg-black">
      <div className="flex gap-3 h-full w-max animate-marquee">
        {[...stickerItems, ...stickerItems].map((_, index) => (
          <img
            key={index}
            src="/sticker.png"
            alt="Happy Feet"
            className="h-12 w-auto max-w-none shrink-0"
          />
        ))}
      </div>
    </div>
  );
}

export default TopSticker;
