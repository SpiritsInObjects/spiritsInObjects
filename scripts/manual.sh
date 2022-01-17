#!/bin/bash

DEPS=(
	pandoc
	./node_modules/.bin/showdown
	jq
)

for dep in "${DEPS[@]}"; do
	if ! command -v "${dep}" &> /dev/null
	then
	    echo "Application ${dep} could not be found"
	    echo "Please install ${dep} before running the manual script"
	    exit 1
	fi
done

YEAR=`date '+%Y'`
HTML="./docs/index.html"
VERSION=`jq -r  '.version' "./package.json"`

############
#
# BUILD HTML
#
############

tmp_file=`mktemp`
./node_modules/.bin/showdown makehtml -i ./docs/README.md -o "${tmp_file}"
tmp_html=`cat "${tmp_file}"`
echo "${tmp_html//\\/<br />}" > "${tmp_file}"
cat ./docs/head.html.tmpl > "${HTML}" 
cat "${tmp_file}" >> "${HTML}"
echo "" >> "${HTML}"
echo "<br/><br/><footer><hr/ ><center>Copyright &copy; ${YEAR}</center>" >> "${HTML}"
echo "" >> "${HTML}"
echo "<br/><center>Build version: ${VERSION}</center>" >> "${HTML}"
echo "</footer>" >> "${HTML}"
cat ./docs/footer.html.tmpl >> "${HTML}"

rm "${tmp_file}"

############
#
# BUILD PDF
#
############

tmp_file=`mktemp`
tmp_md="${tmp_file}.md"

cat "./docs/README.md" > "${tmp_md}"
echo " " >> "${tmp_md}"
echo " " >> "${tmp_md}"
echo "__________" >> "${tmp_md}"
echo "<center>Copyright &copy; ${YEAR}</center>" >> "${tmp_md}"
echo "<center>Build version: ${VERSION}</center>" >> "${tmp_md}"

pandoc "${tmp_md}" -o ./docs/spiritsInObjects-manual.pdf -f markdown+implicit_figures

rm -f "${tmp_md}"
rm -f "${tmp_file}"