import type { Metadata } from "next";
import { BriefcaseBusiness, Cloud, Code2, Database, ShieldCheck } from "lucide-react";
import { PublicContentContainer } from "@/features/content/public-content-container";

export const metadata: Metadata = {
  title: "Malik Technologies | Empowering Businesses Through Technology",
  description: "Malik Technologies builds reliable, scalable, and practical digital solutions for businesses, organizations, and individuals.",
  alternates: {
    canonical: "/malik-technologies",
    languages: { en: "/en/malik-technologies", fa: "/fa/malik-technologies", ps: "/ps/malik-technologies" },
  },
};

const expertise = [
  "Custom software development",
  "Web application development",
  "Mobile application development",
  "Enterprise and business management systems",
  "ERP, HR, inventory, finance, and accounting solutions",
  "E-commerce and marketplace platforms",
  "API development and third-party integrations",
  "Cloud infrastructure and server deployment",
  "Database design and management",
  "Business process automation",
  "Software maintenance and technical support",
];

const principles = [
  { icon: Code2, title: "Practical solutions", text: "Technology designed around real workflows, users, and business goals." },
  { icon: ShieldCheck, title: "Built to last", text: "Secure, maintainable, and dependable systems that grow with your organization." },
  { icon: Cloud, title: "Scalable delivery", text: "Modern applications, infrastructure, and integrations ready for the next stage of growth." },
  { icon: Database, title: "Better operations", text: "Connected systems and automation that reduce manual work and improve efficiency." },
];

export default function MalikTechnologiesPage() {
  return (
    <PublicContentContainer>
      <article className="tech-about">
        <header className="tech-about-hero">
          <span className="tech-about-eyebrow"><BriefcaseBusiness size={16} aria-hidden="true" /> Malik Technologies</span>
          <h1>Empowering Businesses Through Technology</h1>
          <p>Malik Technologies is a technology company focused on building reliable, scalable, and practical digital solutions for businesses, organizations, and individuals.</p>
        </header>

        <section className="tech-about-intro" aria-label="About Malik Technologies">
          <p>We combine modern software engineering, thoughtful design, and business-focused technology to help our clients improve operations, automate processes, and build stronger digital products.</p>
          <p>Our work covers custom software development, web and mobile applications, business management systems, cloud and server infrastructure, system integration, and other technology solutions tailored to real operational needs.</p>
          <p>At Malik Technologies, we believe technology should simplify work rather than make it more complicated. Our goal is to create solutions that are secure, maintainable, easy to use, and capable of growing alongside the businesses that depend on them.</p>
        </section>

        <section className="tech-about-section">
          <div className="tech-about-section-heading">
            <span>Who We Are</span>
            <h2>A technology partner for meaningful growth</h2>
          </div>
          <p>Malik Technologies is a technology and software development company providing modern digital solutions for businesses and organizations. We design and develop systems that help organizations manage their operations more efficiently, strengthen their digital presence, and adopt technology that supports long-term growth.</p>
          <h3>Our expertise includes</h3>
          <ul className="tech-about-expertise">
            {expertise.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="tech-about-principles" aria-label="How we work">
          {principles.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon size={22} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </section>

        <section className="tech-about-section tech-about-statement-grid">
          <div>
            <span>Our Mission</span>
            <h2>Turning requirements into dependable digital solutions</h2>
            <p>Our mission is to help businesses and organizations transform their ideas and operational requirements into dependable digital solutions. We focus on developing technology that solves real problems, improves efficiency, reduces manual work, and creates measurable value.</p>
          </div>
          <div>
            <span>Our Vision</span>
            <h2>A trusted technology partner in Afghanistan and beyond</h2>
            <p>Our vision is to become a trusted technology partner for businesses and organizations seeking modern, scalable, and sustainable digital solutions while contributing to the growth of the technology ecosystem in Afghanistan and beyond.</p>
          </div>
        </section>

        <section className="tech-about-section">
          <div className="tech-about-section-heading">
            <span>Our Approach</span>
            <h2>Start with the business behind the technology</h2>
          </div>
          <p>We approach every project with a strong focus on understanding the business behind the technology. Rather than simply delivering software, we aim to understand workflows, challenges, users, and long-term objectives before designing the solution.</p>
          <p>We emphasize <strong>quality, security, scalability, usability, maintainability, and long-term reliability</strong> throughout the development process.</p>
        </section>

        <section className="tech-about-commitment">
          <span>Why Malik Technologies</span>
          <h2>Technology that works for people and organizations</h2>
          <p>Malik Technologies combines technical expertise with an understanding of practical business requirements. Whether developing a new digital platform, modernizing an existing system, automating internal operations, or deploying business-critical infrastructure, our objective remains the same: to build technology that works for the people and organizations using it.</p>
          <strong>Building technology today for the businesses of tomorrow.</strong>
        </section>
      </article>
    </PublicContentContainer>
  );
}
