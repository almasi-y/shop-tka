"use client";

import type { ComponentProps, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import type { IconType } from "react-icons";

export interface FooterLink {
  title: string;
  href: string;
  icon?: IconType;
  external?: boolean;
}

interface FooterSection {
  label: string;
  links: FooterLink[];
}

interface FooterProps {
  categories: FooterLink[];
  brands: FooterLink[];
}

const socialLinks: FooterLink[] = [
  {
    title: "Facebook",
    href: "https://facebook.com/techkidzafrica",
    icon: FaFacebookF,
    external: true,
  },
  {
    title: "X / Twitter",
    href: "https://twitter.com/techkidzafrica",
    icon: FaXTwitter,
    external: true,
  },
  {
    title: "Instagram",
    href: "https://instagram.com/techkidzafrica",
    icon: FaInstagram,
    external: true,
  },
  {
    title: "LinkedIn",
    href: "https://linkedin.com/company/techkidzafrica",
    icon: FaLinkedinIn,
    external: true,
  },
  {
    title: "YouTube",
    href: "https://youtube.com/@techkidzafrica",
    icon: FaYoutube,
    external: true,
  },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  const Icon = link.icon;
  const content = (
    <>
      {Icon && <Icon aria-hidden className="me-1.5 size-4" />}
      {link.title}
    </>
  );
  const className =
    "inline-flex items-center transition-colors duration-300 hover:text-foreground";

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {content}
    </Link>
  );
}

export function Footer({ categories, brands }: FooterProps) {
  const footerSections: FooterSection[] = [
    {
      label: "Shop",
      links: [
        { title: "All Products", href: "/" },
        { title: "My Orders", href: "/orders" },
      ],
    },
    { label: "Categories", links: categories },
    { label: "Brands", links: brands },
    { label: "Follow Us", links: socialLinks },
  ];

  return (
    <footer className="relative mt-auto w-full rounded-t-4xl border-t bg-zinc-50 dark:bg-zinc-900 bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] md:rounded-t-[3rem]">
      <div className="absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/20 blur" />

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:px-8 lg:py-16 xl:grid-cols-3 xl:gap-8">
        <AnimatedContainer className="space-y-4">
          <Link
            href="/"
            aria-label="TechKidz Africa home"
            className="inline-block"
          >
            <Image
              src="/branding/logo.svg"
              alt="TechKidz Africa"
              width={235}
              height={235}
              className="h-32 w-32 object-contain sm:h-36 sm:w-36"
            />
          </Link>
          <p className="mt-8 text-sm text-muted-foreground md:mt-0">
            © {new Date().getFullYear()} TechKidz Africa. All rights reserved.
          </p>
        </AnimatedContainer>

        <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0">
          {footerSections.map((section, index) => (
            <AnimatedContainer
              key={section.label}
              delay={0.1 + index * 0.1}
            >
              <div className="mb-10 md:mb-0">
                <h2 className="text-xs">{section.label}</h2>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {section.links.map((link) => (
                    <li key={section.label + "-" + link.title}>
                      <FooterLinkItem link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedContainer>
          ))}
        </div>
      </div>
    </footer>
  );
}

type ViewAnimationProps = {
  delay?: number;
  className?: ComponentProps<typeof motion.div>["className"];
  children: ReactNode;
};

function AnimatedContainer({
  className,
  delay = 0.1,
  children,
}: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
