import Image from "next/image";

export default function Logo() {
  return (
    <div className="flex items-center space-x-2 select-none">
      <Image src="/licon.webp" alt="SoundEffectPro logo" width={28} height={28} />

      <div className="relative py-2">
        <span className="text-lg font-extrabold  dark:text-zinc-200 tracking-tight">
          S<span className="text-sm">OUND</span> <span className='font-normal'>E<span className="text-sm">FFECT</span></span>
        </span>
        <div className="wrapper ten absolute top-0 right-0 -translate-y-11.5 translate-x-8">
          <span>
            <span className="text-bounce text-xs font-extrabold text-amber-300">
              <span>P</span>
              <span>R</span>
              <span>O</span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}