import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import vasLogo from "@/assets/images/vas-logo.png";
import {
  Film,
  Mic,
  Image,
  Video,
  BarChart3,
  MessageSquare,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

const features = [
  {
    icon: Film,
    title: "AD SCRIPT GENERATION",
    description: "AI-crafted scripts that speak contractor. No corporate fluff, just lines that land.",
  },
  {
    icon: Mic,
    title: "VOICEOVER PRODUCTION",
    description: "Professional voice synthesis tuned for blue-collar delivery and timing.",
  },
  {
    icon: Image,
    title: "SCENE IMAGE GENERATION",
    description: "Generate jobsite-accurate visuals without a camera crew or a permit.",
  },
  {
    icon: Video,
    title: "VIDEO ASSEMBLY",
    description: "Stitch scenes, audio, and captions into broadcast-ready video automatically.",
  },
  {
    icon: BarChart3,
    title: "COMEDY ANALYTICS",
    description: "Measure joke effectiveness with data. Because gut feeling isn't a KPI.",
  },
  {
    icon: MessageSquare,
    title: "AI COPY ASSISTANT",
    description: "On-demand copywriting that matches your brand voice and industry tone.",
  },
];

const steps = [
  { number: "01", label: "CHOOSE SCENARIO" },
  { number: "02", label: "GENERATE SCRIPT" },
  { number: "03", label: "PRODUCE ASSETS" },
  { number: "04", label: "RENDER VIDEO" },
];

export default function Landing() {
  useEffect(() => {
    document.title = "VAS - Vector Analytical Systems | AI-Powered Predictive Intelligence & Video Production";
  }, []);

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20" data-testid="section-hero">
        <img src={vasLogo} alt="VAS Logo" className="h-[120px] object-contain mb-4" data-testid="img-hero-logo" />
        <h1
          className="font-mono text-5xl md:text-7xl font-bold tracking-tight text-center uppercase"
          data-testid="text-hero-title"
        >
          VAS
        </h1>
        <p
          className="mt-2 text-lg md:text-xl text-muted-foreground text-center max-w-2xl font-mono uppercase tracking-wide"
          data-testid="text-hero-subtitle-brand"
        >
          VECTOR ANALYTICAL SYSTEMS
        </p>
        <p
          className="mt-6 text-lg md:text-xl text-muted-foreground text-center max-w-2xl font-mono uppercase tracking-wide"
          data-testid="text-hero-tagline"
        >
          AI-POWERED PREDICTIVE INTELLIGENCE & VIDEO PRODUCTION
        </p>
        <p
          className="mt-4 text-base text-chrome-dim text-center max-w-xl"
          data-testid="text-hero-subtitle"
        >
          Build ads that hit harder than a foreman's Monday morning joke.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4 justify-center">
          <Link href="/auth">
            <Button data-testid="link-get-started" size="lg">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            onClick={scrollToFeatures}
            data-testid="button-learn-more"
          >
            Learn More
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <section id="features" className="px-6 py-20 max-w-6xl mx-auto" data-testid="section-features">
        <h2
          className="font-mono text-3xl font-bold text-center uppercase tracking-wide mb-12"
          data-testid="text-features-title"
        >
          WHAT IT DOES
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <CardContent className="p-6">
                <feature.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 max-w-5xl mx-auto" data-testid="section-how-it-works">
        <h2
          className="font-mono text-3xl font-bold text-center uppercase tracking-wide mb-12"
          data-testid="text-how-it-works-title"
        >
          HOW IT WORKS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="flex flex-col items-center text-center"
              data-testid={`step-${step.number}`}
            >
              <div className="w-14 h-14 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-mono text-lg font-bold mb-4">
                {step.number}
              </div>
              <p className="font-mono text-sm font-bold uppercase tracking-wider">
                {step.label}
              </p>
              {index < steps.length - 1 && (
                <ArrowRight className="hidden lg:block h-5 w-5 text-muted-foreground absolute translate-x-[calc(100%+1rem)]" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20" data-testid="section-audience">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="font-mono text-3xl font-bold uppercase tracking-wide mb-6"
            data-testid="text-audience-title"
          >
            BUILT FOR CONTRACTORS. NOT CONSULTANTS.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed" data-testid="text-audience-description">
            VAS is designed for the trades -- HVAC, plumbing, electrical, roofing, general contracting.
            The kind of businesses that build things, fix things, and don't have time for marketing agencies
            that charge by the syllable. Generate professional video ads that speak your customers' language,
            with humor that actually works on the jobsite.
          </p>
        </div>
      </section>

      <section className="px-6 py-20" data-testid="section-cta-bottom">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="font-mono text-3xl font-bold uppercase tracking-wide mb-6"
            data-testid="text-cta-bottom"
          >
            DON'T BE THE BUTT OF THE JOKE.
          </h2>
          <p className="text-muted-foreground mb-8">
            Start producing ads that actually convert. No film degree required.
          </p>
          <Link href="/auth">
            <Button data-testid="link-cta-get-started" size="lg">
              Get Started Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-border" data-testid="section-footer">
        <p className="text-center text-sm text-muted-foreground font-mono">
          VAS -- VECTOR ANALYTICAL SYSTEMS
        </p>
      </footer>
    </div>
  );
}
