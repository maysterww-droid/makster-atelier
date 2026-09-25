import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectDetail from "../../project-detail";
import { getPortfolioProject, portfolioProjects } from "../../portfolio-data";
import { createPageMetadata } from "../../seo";

export function generateStaticParams() {
  return portfolioProjects.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getPortfolioProject(slug);
  if (!project) return {};
  const projectCopy = project.copy.cs;

  return createPageMetadata({
    title: projectCopy.title,
    description: `${projectCopy.category}. ${projectCopy.details}. Realizace Makster Atelier.`,
    path: `/realizace/${slug}`,
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getPortfolioProject(slug);
  if (!project) notFound();
  return <ProjectDetail project={project} />;
}
