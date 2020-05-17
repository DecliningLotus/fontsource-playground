const _ = require(`lodash`)
const async = require(`async`)
const fs = require(`fs-extra`)
const jsonfile = require(`jsonfile`)
const path = require(`path`)
const requestSync = require(`sync-request`)

const download = require(`./download-file`)
const { packageJson, fontFace, readme } = require(`./templates`)

const baseurl = `https://google-webfonts-helper.herokuapp.com/api/fonts/`

const id = process.argv[2]
if (!id) {
  console.warn(`Google Font ID has not been passed into packager.`)
  process.exit()
}

//Parse API
const res = requestSync(`GET`, baseurl + id, { retry: true })
const apiFont = JSON.parse(res.getBody(`UTF-8`))
const subsetsWithoutDefault = apiFont.subsets.filter(
  subset => subset !== apiFont.defSubset
)

const subsets = [[apiFont.defSubset, apiFont]].concat(
  subsetsWithoutDefault.map(subset => {
    const subsetRes = requestSync(
      `GET`,
      `${baseurl + id}?subsets=${apiFont.defSubset},${subset}`,
      { retry: true }
    )
    return [subset, JSON.parse(subsetRes.getBody(`UTF-8`))]
  })
)

// Set file directories
const fontDir = `packages/${apiFont.id}`
fs.ensureDirSync(fontDir)
fs.ensureDirSync(`${fontDir}/files`)

// Update checking
let success = false
let changed = false

if (fs.existsSync(`${fontDir}/last-modified.json`)) {
  const lastModifiedJson = jsonfile.readFileSync(
    `${fontDir}/last-modified.json`
  )
  if (!changed) {
    changed = lastModifiedJson.lastModified !== apiFont.lastModified
  }
} else {
  changed = true
}

//jsonfile.writeFileSync(`${fontDir}/font-debug-apiFont.json`, apiFont)
//jsonfile.writeFileSync(`${fontDir}/font-debug-subsets.json`, subsets)

// Processing each subset of given font ID.
if (changed) {
  subsets.forEach(subset => {
    // Generate filenames
    const makeFontFilePath = (item, subsetName, extension) => {
      let style = `normal`
      if (item.fontStyle !== `normal`) {
        style = item.fontStyle
      }
      return `./files/${apiFont.id}-${subsetName}-${item.fontWeight}-${style}.${extension}`
    }

    const makeFontFilePathWeight = (item, subsetName, weight, extension) => {
      let style = `normal`
      if (item.fontStyle !== `normal`) {
        style = item.fontStyle
      }
      return `./files/${apiFont.id}-${subsetName}-${weight}-${style}.${extension}`
    }

    const makeFontFilePathWeightStyle = (
      item,
      subsetName,
      weight,
      style,
      extension
    ) => {
      return `./files/${apiFont.id}-${subsetName}-${weight}-${style}.${extension}`
    }

    // Download all font files.
    async.map(subset[1].variants, (item, callback) => {
      // Download woff, and woff2 in parallel.
      const downloads = [`woff`, `woff2`].map(extension => {
        const dest = path.join(
          fontDir,
          makeFontFilePath(item, subset[0], extension)
        )
        const url = item[extension]
        return {
          extension,
          url,
          dest,
        }
      })
      item.errored = false
      async.map(
        downloads,
        (d, downloadDone) => {
          const { url, dest, extension } = d
          download(url, dest, err => {
            if (err) {
              console.log("Error downloading", apiFont.id, url, err)
              // Track if a download errored.
              item.errored = true
            }
            downloadDone()
          })
        },
        callback
      )

      // Prep CSS writing.
      const variants = _.sortBy(apiFont.variants, item => {
        let sortString = item.fontWeight
        if (item.fontStyle === `italic`) {
          sortString += item.fontStyle
        }
        return sortString
      })

      apiFont.subsets.forEach((subset, _, subsets) => {
        css = variants.map(item => {
          return fontFace({
            fontId: apiFont.id,
            fontName: apiFont.family,
            locals: item.local,
            style: item.fontStyle,
            subset,
            weight: item.fontWeight,
            woffPath: makeFontFilePath(item, subset, "woff"),
            woff2Path: makeFontFilePath(item, subset, "woff2"),
          })
        })
        const fileContentDefault = css.join("")
        // subset.css
        const cssPath = `${fontDir}/${subset}.css`
        fs.writeFileSync(cssPath, fileContentDefault)

        // index.css
        if (subset === "latin" || subsets.length === 1) {
          fs.writeFileSync(`${fontDir}/index.css`, fileContentDefault)
        }

        // subset-weight.css
        weights = variants.reduce((acc, weight) => {
          acc.push(weight.fontWeight)
          return acc
        }, [])
        weights = [...new Set(weights)]

        weights.forEach(weight => {
          cssWeight = variants.map(item => {
            if (item.fontWeight !== weight) {
              return ""
            }

            return fontFace({
              fontId: apiFont.id,
              fontName: apiFont.family,
              locals: item.local,
              style: item.fontStyle,
              subset,
              weight,
              woffPath: makeFontFilePathWeight(item, subset, weight, "woff"),
              woff2Path: makeFontFilePathWeight(item, subset, weight, "woff2"),
            })
          })
          const fileContentWeight = cssWeight.join("")

          const cssWeightPath = `${fontDir}/${subset}-${weight}.css`
          fs.writeFileSync(cssWeightPath, fileContentWeight)

          styles = variants.reduce((acc, style) => {
            acc.push(style.fontStyle)
            return acc
          }, [])
          styles = [...new Set(styles)]

          styles.forEach(style => {
            let once = false
            cssWeightStyle = variants.map(item => {
              if (item.fontStyle !== style || once === true) {
                return ""
              }
              once = true
              return fontFace({
                fontId: apiFont.id,
                fontName: apiFont.family,
                locals: item.local,
                style,
                subset,
                weight,
                woffPath: makeFontFilePathWeightStyle(
                  item,
                  subset,
                  weight,
                  style,
                  "woff"
                ),
                woff2Path: makeFontFilePathWeightStyle(
                  item,
                  subset,
                  weight,
                  style,
                  "woff2"
                ),
              })
            })
            const fileContentWeightStyle = cssWeightStyle.join("")

            const cssWeightStylePath = `${fontDir}/${subset}-${weight}-${style}.css`
            fs.writeFileSync(cssWeightStylePath, fileContentWeightStyle)
          })
        })
      })
    })
  })
  success = true
}

// If everything ran successfully, apply new updates to package.
if (changed && success) {
  // Write README.md
  const packageReadme = readme({
    fontId: apiFont.id,
    fontName: apiFont.family,
  })
  fs.writeFileSync(`${fontDir}/README.md`, packageReadme)

  // Write out package.json file
  const packageJSON = packageJson({
    fontId: apiFont.id,
    fontName: apiFont.family,
  })
  if (fs.existsSync(`${fontDir}/package.json`)) {
    return
  } else {
    fs.writeFileSync(`${fontDir}/package.json`, packageJSON)
  }

  // Write last-modified.json
  jsonfile.writeFileSync(`${fontDir}/last-modified.json`, {
    lastModified: apiFont.lastModified,
    version: apiFont.version,
  })
}

console.log(`Finished processing ${apiFont.id}`)
