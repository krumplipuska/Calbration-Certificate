import os
import re

def combine_files():
    try:
        # Read HTML content
        with open('index.html', 'r', encoding='utf-8') as f:
            html_content = f.read()

        # Read CSS content
        with open('styles.css', 'r', encoding='utf-8') as f:
            css_content = f.read()

        # Read JavaScript content
        with open('script.js', 'r', encoding='utf-8') as f:
            js_content = f.read()

        # Embed CSS and JS into HTML
        # Remove external CSS and JS references if they exist
        html_content = re.sub(r'<link[^>]*href=["\']?styles\.css["\']?[^>]*>\s*', '', html_content)
        html_content = re.sub(r'<script[^>]*src=["\']?script\.js["\']?[^>]*>\s*</script>\s*', '', html_content)

        # Find the closing </head> tag and insert styles before it
        html_content = html_content.replace('</head>', f'<style>\n{css_content}\n</style>\n</head>')

        # Find the closing </body> tag and insert script before it
        html_content = html_content.replace('</body>', f'<script>\n{js_content}\n</script>\n</body>')

        # Write the combined content to a new HTML file
        output_filename = 'combined-document.html'
        with open(output_filename, 'w', encoding='utf-8') as f:
            f.write(html_content)

        print(f'Successfully combined files into {output_filename}')

    except FileNotFoundError as e:
        print(f'Error: File not found - {e}')
    except Exception as e:
        print(f'An error occurred: {e}')

if __name__ == "__main__":
    combine_files() 