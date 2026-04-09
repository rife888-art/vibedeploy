import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import IncidentCards from '@/components/IncidentCards'
import HowItWorks from '@/components/HowItWorks'
import TerminalDemo from '@/components/TerminalDemo'
import Pricing from '@/components/Pricing'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <IncidentCards />
      <HowItWorks />
      <TerminalDemo />
      <Pricing />
      <Footer />
    </main>
  )
}
