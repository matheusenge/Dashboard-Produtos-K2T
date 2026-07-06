tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            display: ['"Space Grotesk"', 'sans-serif'],
            body: ['"DM Sans"', 'sans-serif'],
          },
          colors: {
            base: { DEFAULT: '#0B0D13', light: '#0F1219' },
            surface: { DEFAULT: '#13161F', hover: '#1A1E2A', active: '#222738' },
            border: { subtle: '#1E2230', DEFAULT: '#282D3E' },
            txt: { DEFAULT: '#E8EAEF', secondary: '#9499AD', muted: '#5D6278' },
            accent: { DEFAULT: '#243882', hover: '#2e4a9e', subtle: 'rgba(36,56,130,0.10)' },
            ok: { DEFAULT: '#2DD4A0', subtle: 'rgba(45,212,160,0.10)' },
            warn: { DEFAULT: '#F5BF24', subtle: 'rgba(245,191,36,0.10)' },
            err: { DEFAULT: '#EF6B6B', subtle: 'rgba(239,107,107,0.10)' },
          }
        }
      }
    }

