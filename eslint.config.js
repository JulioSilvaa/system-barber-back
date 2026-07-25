import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'


export default [
  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    languageOptions:{
      globals:{
        ...globals.node
      }
    },

    plugins:{
      prettier
    },

    rules:{
      "prettier/prettier":"error"
    }
  }

]