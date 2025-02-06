import Image from 'next/image'

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#1a1b1e]/80 backdrop-blur-md border-t border-[#2c2d32]">
      <div className="max-w-7xl mx-auto px-3 md:px-4 h-12 md:h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/liondexlogo.png"
            alt="LionDEX Logo"
            width={16}
            height={16}
            className="w-4 h-4 md:w-5 md:h-5"
          />
          <p className="text-zinc-400 text-xs md:text-sm truncate">
            © {new Date().getFullYear()} LionDEX
            <span className="hidden sm:inline">. Copyleft.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <a 
            href="https://docs.cronos.org" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white text-xs md:text-sm transition-colors"
          >
            Docs
          </a>
          <a 
            href="https://e1digital.xyz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white text-xs md:text-sm transition-colors"
          >
            E1DIGITAL
          </a>
        </div>
      </div>
    </footer>
  )
}