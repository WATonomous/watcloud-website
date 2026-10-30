// Nextra's MDX loader (nextra/dist/server/loader.js) without the git timestamp lookup
module.exports = async function mdxFixtureLoader(source) {
  const callback = this.async()
  try {
    const { compileMdx } = await import('nextra/compile')
    const { mdxOptions, ...options } = this.getOptions()
    callback(null, await compileMdx(source, {
      ...options,
      mdxOptions: { ...mdxOptions, jsx: true, outputFormat: 'program' },
      filePath: this.resourcePath,
      // The cached compiler is shared with docs pages and keeps the first file's timestamp: https://github.com/shuding/nextra/issues/4963
      useCachedCompiler: false,
    }))
  } catch (error) {
    callback(error)
  }
}
